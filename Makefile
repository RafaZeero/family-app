.PHONY: dev api view tauri clean install

# Default target - start both API and Tauri dev
dev:
	@echo "Starting Kids Cam development environment..."
	@$(MAKE) -j2 api tauri

# Start API server
api:
	@echo "Starting API server..."
	# @cd api && pnpm run dev
	@cd api_go && go run main.go

# Start Tauri development server
tauri:
	@echo "Starting Tauri development server..."
	@cargo tauri dev

# Start only the view (frontend)
view:
	@echo "Starting view development server..."
	@cd view && pnpm run dev

# Install dependencies
install:
	@echo "Installing dependencies..."
	@cd api && pnpm install
	@cd view && pnpm install

# Clean build artifacts
clean:
	@echo "Cleaning build artifacts..."
	@cd api && rm -rf node_modules
	@cd view && rm -rf node_modules dist
	@cd src-tauri && cargo clean

# Help
help:
	@echo "Available targets:"
	@echo "  dev     - Start both API and Tauri dev (default)"
	@echo "  api     - Start only the API server"
	@echo "  tauri   - Start only the Tauri development server"
	@echo "  view    - Start only the view development server"
	@echo "  install - Install all dependencies"
	@echo "  clean   - Clean build artifacts"
	@echo "  help    - Show this help message"
