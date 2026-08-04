package main

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"log"
	"net"
	"os"
	"strings"
	"sync"
	"time"

	"github.com/miekg/dns"
)

type BlockList struct {
	Name     string   `json:"name"`
	URL      string   `json:"url"`
	Domains  []string `json:"domains"`
	Enabled  bool     `json:"enabled"`
	LastSync time.Time `json:"last_sync"`
}

type DNSShield struct {
	listenAddr    string
	upstreamDNS   []string
	blocklists    []*BlockList
	blockedDomains map[string]bool
	whitelist     map[string]bool
	queryLog      []QueryLog
	logMutex      sync.RWMutex
	blockMutex    sync.RWMutex
	cacheSize     int
	dnsCache      map[string]dnsCacheEntry
	cacheMutex    sync.RWMutex
}

type QueryLog struct {
	Timestamp time.Time `json:"timestamp"`
	Domain    string    `json:"domain"`
	ClientIP  string    `json:"client_ip"`
	Blocked   bool      `json:"blocked"`
	Reason    string    `json:"reason"`
}

type dnsCacheEntry struct {
	answer  *dns.Msg
	expires time.Time
}

func NewDNSShield(listenAddr string, upstreamDNS []string, cacheSize int) *DNSShield {
	return &DNSShield{
		listenAddr:     listenAddr,
		upstreamDNS:    upstreamDNS,
		blocklists:     []*BlockList{},
		blockedDomains: make(map[string]bool),
		whitelist:      make(map[string]bool),
		queryLog:       []QueryLog{},
		cacheSize:      cacheSize,
		dnsCache:       make(map[string]dnsCacheEntry),
	}
}

func (ds *DNSShield) LoadBlocklists(configFile string) error {
	data, err := os.ReadFile(configFile)
	if err != nil {
		log.Printf("Warning: Could not load blocklists config: %v", err)
		return nil
	}

	var lists []*BlockList
	if err := json.Unmarshal(data, &lists); err != nil {
		return fmt.Errorf("failed to parse blocklists: %w", err)
	}

	for _, list := range lists {
		if list.Enabled {
			ds.blocklists = append(ds.blocklists, list)
			for _, domain := range list.Domains {
				ds.blockMutex.Lock()
				ds.blockedDomains[strings.ToLower(domain)] = true
				ds.blockMutex.Unlock()
			}
		}
	}

	log.Printf("Loaded %d blocklists with %d total blocked domains", len(ds.blocklists), len(ds.blockedDomains))
	return nil
}

func (ds *DNSShield) LoadWhitelist(whitelistFile string) error {
	file, err := os.Open(whitelistFile)
	if err != nil {
		log.Printf("Warning: Could not load whitelist: %v", err)
		return nil
	}
	defer file.Close()

	scanner := bufio.NewScanner(file)
	for scanner.Scan() {
		domain := strings.TrimSpace(strings.ToLower(scanner.Text()))
		if domain != "" && !strings.HasPrefix(domain, "#") {
			ds.blockMutex.Lock()
			ds.whitelist[domain] = true
			ds.blockMutex.Unlock()
		}
	}

	log.Printf("Loaded %d whitelisted domains", len(ds.whitelist))
	return nil
}

func (ds *DNSShield) IsBlocked(domain string) (bool, string) {
	domain = strings.ToLower(domain)

	ds.blockMutex.RLock()
	defer ds.blockMutex.RUnlock()

	if ds.whitelist[domain] {
		return false, "whitelisted"
	}

	if ds.blockedDomains[domain] {
		return true, "blocked_domain"
	}

	for blocked := range ds.blockedDomains {
		if strings.HasSuffix(domain, "."+blocked) {
			return true, "blocked_subdomain"
		}
	}

	return false, ""
}

func (ds *DNSShield) QueryUpstream(w dns.ResponseWriter, r *dns.Msg) {
	if len(ds.upstreamDNS) == 0 {
		return
	}

	cacheKey := r.Question[0].Name + ":" + dns.TypeToString[r.Question[0].Qtype]
	ds.cacheMutex.RLock()
	if cached, ok := ds.dnsCache[cacheKey]; ok && time.Now().Before(cached.expires) {
		cached.answer.Id = r.Id
		w.WriteMsg(cached.answer)
		ds.cacheMutex.RUnlock()
		return
	}
	ds.cacheMutex.RUnlock()

	c := new(dns.Client)
	c.Timeout = 5 * time.Second

	resp, _, err := c.Exchange(r, ds.upstreamDNS[0])
	if err != nil {
		log.Printf("Upstream DNS error: %v", err)
		return
	}

	ds.cacheMutex.Lock()
	if len(ds.dnsCache) >= ds.cacheSize {
		for k := range ds.dnsCache {
			delete(ds.dnsCache, k)
			break
		}
	}
	ttl := time.Duration(300) * time.Second
	if resp.Answer != nil && len(resp.Answer) > 0 {
		ttl = time.Duration(resp.Answer[0].Header().Ttl) * time.Second
	}
	ds.dnsCache[cacheKey] = dnsCacheEntry{resp, time.Now().Add(ttl)}
	ds.cacheMutex.Unlock()

	w.WriteMsg(resp)
}

func (ds *DNSShield) HandleDNS(w dns.ResponseWriter, r *dns.Msg) {
	m := new(dns.Msg)
	m.SetReply(r)
	m.RecursionAvailable = true

	clientIP := w.RemoteAddr().String()

	for _, q := range r.Question {
		domain := q.Name
		if domain[len(domain)-1] == '.' {
			domain = domain[:len(domain)-1]
		}

		blocked, reason := ds.IsBlocked(domain)
		ds.logQuery(domain, clientIP, blocked, reason)

		if blocked {
			m.SetRcode(r, dns.RcodeNameError)
			log.Printf("BLOCKED: %s from %s (reason: %s)", domain, clientIP, reason)
		} else {
			ds.QueryUpstream(w, r)
			return
		}
	}

	w.WriteMsg(m)
}

func (ds *DNSShield) logQuery(domain, clientIP string, blocked bool, reason string) {
	ds.logMutex.Lock()
	defer ds.logMutex.Unlock()

	log := QueryLog{
		Timestamp: time.Now(),
		Domain:    domain,
		ClientIP:  clientIP,
		Blocked:   blocked,
		Reason:    reason,
	}

	ds.queryLog = append(ds.queryLog, log)
	if len(ds.queryLog) > 10000 {
		ds.queryLog = ds.queryLog[1:]
	}
}

func (ds *DNSShield) GetStats() map[string]interface{} {
	ds.logMutex.RLock()
	defer ds.logMutex.RUnlock()

	blocked := 0
	for _, log := range ds.queryLog {
		if log.Blocked {
			blocked++
		}
	}

	return map[string]interface{}{
		"total_queries":  len(ds.queryLog),
		"blocked":        blocked,
		"blocked_domains": len(ds.blockedDomains),
		"whitelist_size": len(ds.whitelist),
	}
}

func (ds *DNSShield) Start() error {
	dns.HandleFunc(".", ds.HandleDNS)

	server := &dns.Server{
		Addr:              ds.listenAddr,
		Net:               "udp",
		TsigSecret:        nil,
		NotifyStartedFunc: func() { log.Printf("DNS Shield listening on %s", ds.listenAddr) },
	}

	go func() {
		if err := server.ListenAndServe(); err != nil {
			log.Printf("DNS server error: %v", err)
		}
	}()

	tcpServer := &dns.Server{
		Addr:       ds.listenAddr,
		Net:        "tcp",
		TsigSecret: nil,
	}

	return tcpServer.ListenAndServe()
}

func main() {
	listenAddr := os.Getenv("LISTEN_ADDR")
	if listenAddr == "" {
		listenAddr = "0.0.0.0:53"
	}

	upstreamDNS := os.Getenv("UPSTREAM_DNS")
	if upstreamDNS == "" {
		upstreamDNS = "8.8.8.8:53,1.1.1.1:53"
	}

	upstreamServers := strings.Split(upstreamDNS, ",")
	for i := range upstreamServers {
		upstreamServers[i] = strings.TrimSpace(upstreamServers[i])
	}

	shield := NewDNSShield(listenAddr, upstreamServers, 10000)

	if err := shield.LoadBlocklists("/app/config/blocklists.json"); err != nil {
		log.Printf("Error loading blocklists: %v", err)
	}

	if err := shield.LoadWhitelist("/app/config/whitelist.txt"); err != nil {
		log.Printf("Error loading whitelist: %v", err)
	}

	log.Printf("Starting McAfee DNS Shield with %d blocked domains", len(shield.blockedDomains))
	if err := shield.Start(); err != nil {
		log.Fatalf("Failed to start DNS server: %v", err)
	}
}
