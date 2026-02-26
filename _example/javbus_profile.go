package main

import (
	"fmt"

	"github.com/family-flix/api/pkg/media_profile/javbus"
)

func main() {
	client := javbus.NewJavBusClient("")

	// 1. Verification Step (Handled internally with persistence)
	// err := client.Verify()
	// if err != nil {
	// 	log.Fatalf("Verification failed: %v", err)
	// }
	// fmt.Println("Auth OK")

	// 2. Define Keyword
	// keyword := "MVSD-578"

	// var allMovies []javbus.Movie

	// if keyword == "" {
	// 	return
	// }
	// fmt.Printf("Search: %s\n", keyword)
	// // for p := 1; p <= 10; p++ {

	// // }
	// p := 1
	// resp, err := client.Search(keyword, p)
	// if err != nil {
	// 	log.Printf("Failed to fetch page %d: %v", p, err)
	// 	return
	// }

	// fmt.Printf("P%d: %d\n", p, len(resp.Data))

	// if len(resp.Data) == 0 {
	// 	return
	// }
	// allMovies = append(allMovies, resp.Data...)

	// // if !resp.NextPage {
	// // 	return
	// // }

	// fmt.Printf("Found: %d\n", len(allMovies))
	// for _, m := range allMovies {
	// 	fmt.Printf("{c:%s t:%s v:%s l:%s}\n", m.Code, m.Title, m.Cover, m.Link)
	// }

	detail, err := client.GetMovieDetail("STARS-456")
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println(detail.Actors)
	fmt.Println(detail.Cover)
	fmt.Println(detail.Backdrop)
	// for _, img := range detail.SampleImages {
	// 	fmt.Println(img)
	// }
}
