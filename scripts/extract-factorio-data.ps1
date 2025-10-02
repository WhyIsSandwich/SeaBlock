# Simplified Factorio Data Extraction Script
# PowerShell version for Windows
# Runs the required 3 Factorio commands for data extraction

param(
    [string]$Path = "",
    [switch]$Help
)

# Function to print colored output
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Function to show help
function Show-Help {
    Write-Info "Factorio Data Extraction Script"
    Write-Info "================================"
    Write-Host ""
    Write-Host "Usage: .\extract-factorio-data.ps1 -Path PATH [OPTIONS]"
    Write-Host ""
    Write-Host "Options:"
    Write-Host "  -Path PATH        Path to Factorio executable (required)"
    Write-Host "  -Help            Show this help message"
    Write-Host ""
    Write-Host "Examples:"
    Write-Host "  .\extract-factorio-data.ps1 -Path 'C:\Program Files\Factorio\bin\x64\factorio.exe'"
    Write-Host "  .\extract-factorio-data.ps1 -Path 'C:\Steam\steamapps\common\Factorio\bin\x64\factorio.exe'"
    Write-Host "  .\extract-factorio-data.ps1 -Path 'C:\Program Files (x86)\Factorio\bin\x64\factorio.exe'"
}

# Function to validate Factorio executable
function Test-FactorioExecutable {
    param([string]$Path)
    
    if ([string]::IsNullOrEmpty($Path)) {
        Write-Error "Factorio path is required."
        return $false
    }
    
    if (-not (Test-Path $Path)) {
        Write-Error "Factorio executable does not exist: $Path"
        return $false
    }
    
    return $true
}

# Main execution
if ($Help) {
    Show-Help
    exit 0
}

Write-Info "Factorio Data Extraction Script"
Write-Info "================================"

# Validate required path parameter
if (-not (Test-FactorioExecutable $Path)) {
    Write-Error "Factorio path is required. Use -Path to specify the path."
    Write-Info "Use -Help for usage information"
    exit 1
}

Write-Success "Using Factorio executable: $Path"

# Run the required 3 Factorio commands
Write-Info "Starting Factorio data extraction..."
Write-Info "This may take a few minutes depending on your system..."

# Run the extractions sequentially (each command must be run separately)
try {
    Write-Info "Running --dump-data..."
    $process1 = Start-Process -FilePath $Path -ArgumentList "--dump-data" -Wait -PassThru -NoNewWindow
    if ($process1.ExitCode -ne 0) {
        Write-Error "Factorio --dump-data failed with exit code: $($process1.ExitCode)"
        exit 1
    }
    
    Write-Info "Running --dump-prototype-locale..."
    $process2 = Start-Process -FilePath $Path -ArgumentList "--dump-prototype-locale" -Wait -PassThru -NoNewWindow
    if ($process2.ExitCode -ne 0) {
        Write-Error "Factorio --dump-prototype-locale failed with exit code: $($process2.ExitCode)"
        exit 1
    }
    
    Write-Info "Running --dump-icon-sprites..."
    $process3 = Start-Process -FilePath $Path -ArgumentList "--dump-icon-sprites" -Wait -PassThru -NoNewWindow
    if ($process3.ExitCode -ne 0) {
        Write-Error "Factorio --dump-icon-sprites failed with exit code: $($process3.ExitCode)"
        exit 1
    }
    
    Write-Success "All Factorio data extractions completed successfully!"
    Write-Info "Factorio output files are in the script-output directory."
    
} catch {
    Write-Error "Failed to run Factorio: $($_.Exception.Message)"
    exit 1
}

Write-Success "Script completed successfully!"
