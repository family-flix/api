package main

import (
	"fmt"
	"log"

	"github.com/family-flix/api/pkg/media_profile/javbus"
)

func main() {
	keyword := "SSNI"
	client := javbus.NewJavBusClient("")
	err := client.Verify()
	if err != nil {
		log.Fatalf("Verification failed: %v", err)
	}
	fmt.Println("Auth OK")

	var allMovies []javbus.Movie
	if keyword == "" {
		return
	}
	fmt.Printf("Search: %s\n", keyword)
	p := 1
	resp, err := client.Search(keyword, p)
	if err != nil {
		log.Printf("Failed to fetch page %d: %v", p, err)
		return
	}

	fmt.Printf("P%d: %d\n", p, len(resp.Data))
	if len(resp.Data) == 0 {
		return
	}
	allMovies = append(allMovies, resp.Data...)
	fmt.Printf("Found: %d\n", len(allMovies))
	for _, m := range allMovies {
		fmt.Printf("{c:%s t:%s v:%s l:%s}\n", m.Code, m.Title, m.Cover, m.Link)
	}
}
