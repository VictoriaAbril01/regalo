param(
    [int]$Port = 8000,
    [string]$Sender = 'akane8264@gmail.com'
)

$pythonPath = Join-Path $PSScriptRoot '.venv\Scripts\python.exe'
if (-not (Test-Path -LiteralPath $pythonPath)) {
    throw 'No encuentro .venv. Ejecuta primero python -m pip install -r requirements.txt en tu entorno virtual.'
}

$securePassword = Read-Host 'Contraseña de aplicación de Gmail (16 caracteres)' -AsSecureString
$passwordPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($securePassword)
try {
    $env:SMTP_USER = $Sender
    $env:SMTP_APP_PASSWORD = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($passwordPointer)
    $env:WISHES_EMAIL_TO = 'akane8264@gmail.com'
    Push-Location $PSScriptRoot
    try {
        & $pythonPath -m uvicorn backend.main:app --host 0.0.0.0 --port $Port
    } finally {
        Pop-Location
    }
} finally {
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($passwordPointer)
    Remove-Item Env:SMTP_APP_PASSWORD -ErrorAction SilentlyContinue
}
