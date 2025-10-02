#!/bin/bash

# Simplified Factorio Data Extraction Script
# Runs the required 3 Factorio commands for data extraction

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to validate Factorio executable
validate_factorio_executable() {
    local factorio_path="$1"
    
    if [ -z "$factorio_path" ]; then
        print_error "Factorio path is required."
        return 1
    fi
    
    if [ ! -f "$factorio_path" ]; then
        print_error "Factorio executable does not exist: $factorio_path"
        return 1
    fi
    
    if [ ! -x "$factorio_path" ]; then
        print_error "Factorio executable is not executable: $factorio_path"
        return 1
    fi
    
    return 0
}

# Main function
main() {
    print_info "Factorio Data Extraction Script"
    print_info "================================"
    
    # Parse command line arguments
    FACTORIO_PATH=""
    
    while [[ $# -gt 0 ]]; do
        case $1 in
            -p|--path)
                FACTORIO_PATH="$2"
                shift 2
                ;;
            -h|--help)
                echo "Usage: $0 -p PATH [OPTIONS]"
                echo ""
                echo "Options:"
                echo "  -p, --path PATH        Path to Factorio executable (required)"
                echo "  -h, --help            Show this help message"
                echo ""
                echo "Examples:"
                echo "  $0 -p /usr/games/factorio"
                echo "  $0 --path \"/Applications/Factorio.app/Contents/MacOS/factorio\""
                echo "  $0 -p \"/opt/factorio/bin/x64/factorio\""
                exit 0
                ;;
            *)
                print_error "Unknown option: $1"
                echo "Use -h or --help for usage information"
                exit 1
                ;;
        esac
    done
    
    # Validate required path parameter
    if [ -z "$FACTORIO_PATH" ]; then
        print_error "Factorio path is required. Use -p or --path to specify the path."
        echo "Use -h or --help for usage information"
        exit 1
    fi
    
    # Validate provided path
    if ! validate_factorio_executable "$FACTORIO_PATH"; then
        exit 1
    fi
    
    print_success "Using Factorio executable: $FACTORIO_PATH"
    
    # Run the required 3 Factorio commands
    print_info "Starting Factorio data extraction..."
    print_info "This may take a few minutes depending on your system..."
    
    # Run the extractions sequentially (each command must be run separately)
    print_info "Running --dump-data..."
    if ! "$FACTORIO_PATH" --dump-data; then
        print_error "Factorio --dump-data failed!"
        exit 1
    fi
    
    print_info "Running --dump-prototype-locale..."
    if ! "$FACTORIO_PATH" --dump-prototype-locale; then
        print_error "Factorio --dump-prototype-locale failed!"
        exit 1
    fi
    
    print_info "Running --dump-icon-sprites..."
    if ! "$FACTORIO_PATH" --dump-icon-sprites; then
        print_error "Factorio --dump-icon-sprites failed!"
        exit 1
    fi
    
    print_success "All Factorio data extractions completed successfully!"
    print_info "Factorio output files are in the script-output directory."
}

# Run main function
main "$@"
