package handler

import (
	"context"
	"io"

	"github.com/labstack/echo/v4"
	"gorm.io/gorm"
)

// EchoContext wraps echo.Context to implement the Context interface.
type EchoContext struct {
	ec        echo.Context
	db        *gorm.DB
	baseDir   string
	cacheDir  string
	ffmpegBin string
}

func NewEchoContext(ec echo.Context, db *gorm.DB, baseDir, cacheDir, ffmpegBin string) *EchoContext {
	return &EchoContext{ec: ec, db: db, baseDir: baseDir, cacheDir: cacheDir, ffmpegBin: ffmpegBin}
}

func (c *EchoContext) Param(name string) string           { return c.ec.Param(name) }
func (c *EchoContext) QueryParam(name string) string      { return c.ec.QueryParam(name) }
func (c *EchoContext) Header(name string) string          { return c.ec.Request().Header.Get(name) }
func (c *EchoContext) Bind(v interface{}) error           { return c.ec.Bind(v) }
func (c *EchoContext) Body() io.ReadCloser                { return c.ec.Request().Body }
func (c *EchoContext) Context() context.Context           { return c.ec.Request().Context() }
func (c *EchoContext) JSON(code int, v interface{}) error { return c.ec.JSON(code, v) }
func (c *EchoContext) Stream(code int, contentType string, body io.Reader) error {
	return c.ec.Stream(code, contentType, body)
}
func (c *EchoContext) DB() *gorm.DB      { return c.db.Session(&gorm.Session{NewDB: true}) }
func (c *EchoContext) BaseDir() string   { return c.baseDir }
func (c *EchoContext) CacheDir() string  { return c.cacheDir }
func (c *EchoContext) FFmpegBin() string { return c.ffmpegBin }

// WrapEcho converts a HandlerFunc into an echo.HandlerFunc.
func WrapEcho(db *gorm.DB, baseDir, cacheDir, ffmpegBin string, h HandlerFunc) echo.HandlerFunc {
	return func(ec echo.Context) error {
		return h(NewEchoContext(ec, db, baseDir, cacheDir, ffmpegBin))
	}
}
