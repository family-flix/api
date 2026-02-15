package main

import (
	"fmt"

	"github.com/family-flix/api/pkg/drive_client/localdrive"
	"github.com/family-flix/api/pkg/folder"
	"github.com/family-flix/api/pkg/walker"
)

func main() {
	// Get current working directory
	// cwd, err := os.Getwd()
	// if err != nil {
	// 	panic(err)
	// }

	// We'll walk the parent of cwd to see more stuff, or just cwd
	// root_path := cwd
	root_path := "/Users/litao/Documents/FakeLocalDrive"
	fmt.Printf("Walking: %s\n", root_path)

	client := localdrive.NewLocalDriveClient()

	// Create Folder instance
	// ID is the absolute path
	prevFolder := folder.NewFolder(root_path, client, []folder.ParentFolder{}, nil)

	// Fetch profile
	profile, err := prevFolder.Profile()
	if err != nil {
		fmt.Printf("fetch folder profile failed %v\n", err)
		return
	}
	fmt.Printf("Folder Profile: %+v\n", profile)

	// Create Walker
	w := walker.NewFolderWalker()

	// Set callbacks
	// w.SetOnFile(func(f folder.File) error {
	// 	rel, _ := filepath.Rel(root_path, f.ID)
	// 	fmt.Printf("File: %s (Size: %d)\n", rel, f.Size)
	// 	return nil
	// })
	w.SetOnEpisode(func(f walker.SearchedEpisode) error {
		// rel, _ := filepath.Rel(root_path, f.ID)
		// fmt.Println(f.Episode.FileName)
		fmt.Printf("Episode: %s %s %s\n", f.TV.Name, f.Season.SeasonText, f.Episode.EpisodeText)
		return nil
	})

	w.SetOnError(func(f folder.File) {
		fmt.Printf("Error processing %s\n", f.Name)
	})

	// Run Walker
	fmt.Println("Starting walker...")
	err = w.Run(prevFolder, []string{})
	if err != nil {
		fmt.Printf("Walker run failed: %v\n", err)
		return
	}
	fmt.Println("Walker finished.")
}
