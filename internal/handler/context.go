package handler

import (
	"io"

	"gorm.io/gorm"
)

// Context abstracts the HTTP request/response so handlers don't depend on any specific router.
type Context interface {
	// Request
	Param(name string) string
	QueryParam(name string) string
	Header(name string) string
	Bind(v interface{}) error
	Body() io.ReadCloser

	// Response
	JSON(code int, v interface{}) error

	// Services
	DB() *gorm.DB
	LogDir() string
}

// HandlerFunc is the handler signature used throughout the app.
type HandlerFunc func(c Context) error
