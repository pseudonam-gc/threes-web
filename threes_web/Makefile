.PHONY: serve dev clean help

# Default port
PORT ?= 8080

help:
	@echo "Threes Web - Available commands:"
	@echo "  make serve    - Start local server on port $(PORT)"
	@echo "  make dev      - Start server with live reload (requires npx)"
	@echo "  make clean    - Remove generated files"
	@echo ""
	@echo "Options:"
	@echo "  PORT=3000 make serve  - Use custom port"

serve:
	@echo "Starting server at http://localhost:$(PORT)"
	@python3 -m http.server $(PORT)

dev:
	@command -v npx >/dev/null 2>&1 && npx serve -l $(PORT) . || \
		(echo "npx not found, falling back to python" && python3 -m http.server $(PORT))

clean:
	@rm -rf .DS_Store
	@find . -name "*.pyc" -delete
	@find . -name "__pycache__" -delete
	@echo "Cleaned"
