"""
Application configuration with environment variable validation using Pydantic Settings.
"""

from typing import List
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """
    Application settings with automatic environment variable validation.
    
    All settings are loaded from environment variables and validated at startup.
    Missing required fields will cause the application to fail fast with clear error messages.
    """
    
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",  # Ignore extra env vars that aren't defined here
    )
    
    # ==================== API Configuration ====================
    API_TITLE: str = Field(default="Application API", description="API title")
    API_VERSION: str = Field(default="1.0.0", description="API version")
    DEBUG: bool = Field(default=False, description="Enable debug mode")
    
    # ==================== Domain Configuration ====================
    DOMAIN_NAME: str = Field(
        default="localhost",
        description="Domain name for the application"
    )
    WEB_PORT: int = Field(
        default=8000,
        ge=1,
        le=65535,
        description="Web server port"
    )
    
    # ==================== CORS Configuration ====================
    CORS_ORIGINS: str = Field(
        default="",
        description="Comma-separated list of allowed CORS origins. If empty, defaults are generated from DOMAIN_NAME"
    )
    CORS_CREDENTIALS: bool = Field(default=True, description="Allow CORS credentials")
    CORS_METHODS: str = Field(
        default="GET,POST,PUT,DELETE,PATCH,OPTIONS",
        description="Comma-separated list of allowed HTTP methods"
    )
    CORS_HEADERS: str = Field(
        default="*",
        description="Comma-separated list of allowed headers, or '*' for all"
    )
    
    # ==================== Database Configuration ====================
    POSTGRES_DB: str = Field(
        default="mydb",
        min_length=1,
        description="PostgreSQL database name"
    )
    POSTGRES_USER: str = Field(
        default="example_app",
        min_length=1,
        description="PostgreSQL username"
    )
    POSTGRES_PASSWORD: str = Field(
        default="",
        description="PostgreSQL password (required in production)"
    )
    POSTGRES_HOST: str = Field(
        default="db",
        description="PostgreSQL host"
    )
    POSTGRES_PORT: int = Field(
        default=5432,
        ge=1,
        le=65535,
        description="PostgreSQL port"
    )
    
    # ==================== JWT Authentication Configuration ====================
    SECRET_KEY: str = Field(
        default="your-secret-key-change-in-production",
        min_length=32,
        description="Secret key for JWT token signing (MUST be changed in production, min 32 chars)"
    )
    ALGORITHM: str = Field(
        default="HS256",
        description="JWT algorithm (HS256, RS256, etc.)"
    )
    ACCESS_TOKEN_EXPIRE_MINUTES: int = Field(
        default=30,
        ge=1,
        le=1440,  # Max 24 hours
        description="Access token expiration time in minutes"
    )
    
    # ==================== Cookie Configuration ====================
    COOKIE_DOMAIN: str = Field(
        default="",
        description="Cookie domain for cross-subdomain authentication (e.g., '.example.com'). Empty for localhost."
    )
    COOKIE_SECURE: bool = Field(
        default=True,
        description="Set Secure flag on cookies (HTTPS only). Should be True in production."
    )
    COOKIE_SAMESITE: str = Field(
        default="lax",
        description="SameSite cookie attribute: 'strict', 'lax', or 'none'"
    )
    
    # ==================== Email Configuration ====================
    SMTP_ENABLED: bool = Field(
        default=False,
        description="Enable email sending via SMTP"
    )
    SMTP_HOST: str = Field(
        default="smtp.gmail.com",
        description="SMTP server hostname"
    )
    SMTP_PORT: int = Field(
        default=587,
        ge=1,
        le=65535,
        description="SMTP server port (587 for TLS, 465 for SSL)"
    )
    SMTP_USER: str = Field(
        default="",
        description="SMTP username (usually email address)"
    )
    SMTP_PASSWORD: str = Field(
        default="",
        description="SMTP password or app-specific password"
    )
    SMTP_FROM_EMAIL: str = Field(
        default="noreply@localhost",
        description="From email address for sent emails"
    )
    SMTP_FROM_NAME: str = Field(
        default="Booker",
        description="From name for sent emails"
    )
    SMTP_USE_TLS: bool = Field(
        default=True,
        description="Use TLS for SMTP connection"
    )

    # ==================== Google OAuth Configuration ====================
    GOOGLE_CLIENT_ID: str = Field(
        default="",
        description="Google OAuth 2.0 Client ID"
    )
    GOOGLE_CLIENT_SECRET: str = Field(
        default="",
        description="Google OAuth 2.0 Client Secret"
    )
    GOOGLE_REDIRECT_URI: str = Field(
        default="",
        description="Google OAuth 2.0 Redirect URI"
    )

    # ==================== OpenAI Configuration ====================
    OPENAI_API_KEY: str = Field(
        default="",
        description="OpenAI API key for AI suggestions"
    )
    OPENAI_MODEL: str = Field(
        default="gpt-4o-mini",
        description="OpenAI model to use (gpt-4o-mini, gpt-4o, etc.)"
    )
    OPENAI_MAX_TOKENS: int = Field(
        default=500,
        ge=1,
        le=4000,
        description="Maximum tokens for completion"
    )
    OPENAI_TEMPERATURE: float = Field(
        default=0.7,
        ge=0.0,
        le=2.0,
        description="Temperature for generation (0.0-2.0)"
    )

    # ==================== Redis Configuration ====================
    REDIS_HOST: str = Field(
        default="redis",
        description="Redis host for Celery broker/backend"
    )
    REDIS_PORT: int = Field(
        default=6379,
        ge=1,
        le=65535,
        description="Redis port"
    )
    REDIS_DB: int = Field(
        default=0,
        ge=0,
        le=15,
        description="Redis database number (0-15)"
    )

    # ==================== Computed Properties ====================
    @property
    def cors_origins_list(self) -> List[str]:
        """Get CORS origins as a list, with smart defaults."""
        if self.CORS_ORIGINS:
            # Use explicitly provided origins
            return [
                origin.strip()
                for origin in self.CORS_ORIGINS.split(",")
                if origin.strip()
            ]
        else:
            # Generate defaults from DOMAIN_NAME
            return [
                f"https://{self.DOMAIN_NAME}",
                f"https://www.{self.DOMAIN_NAME}",
                "http://localhost:3000",
                "http://localhost:5173",
            ]
    
    @property
    def cors_methods_list(self) -> List[str]:
        """Get CORS methods as a list."""
        return [
            method.strip().upper()
            for method in self.CORS_METHODS.split(",")
            if method.strip()
        ]
    
    @property
    def cors_headers_list(self) -> List[str]:
        """Get CORS headers as a list."""
        if self.CORS_HEADERS.strip() == "*":
            return ["*"]
        return [
            header.strip()
            for header in self.CORS_HEADERS.split(",")
            if header.strip()
        ]
    
    @property
    def cookie_domain(self) -> str | None:
        """Get cookie domain, or None for localhost."""
        if not self.COOKIE_DOMAIN:
            return None
        # Ensure domain starts with . for subdomain sharing
        if not self.COOKIE_DOMAIN.startswith("."):
            return f".{self.COOKIE_DOMAIN}"
        return self.COOKIE_DOMAIN
    
    # ==================== Validators ====================
    @field_validator("DEBUG", mode="before")
    @classmethod
    def parse_debug(cls, v) -> bool:
        """Parse DEBUG from string to bool."""
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ("1", "true", "yes", "on")
        return bool(v)
    
    @field_validator("CORS_CREDENTIALS", mode="before")
    @classmethod
    def parse_cors_credentials(cls, v) -> bool:
        """Parse CORS_CREDENTIALS from string to bool."""
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ("1", "true", "yes", "on")
        return bool(v)
    
    @field_validator("SMTP_ENABLED", mode="before")
    @classmethod
    def parse_smtp_enabled(cls, v) -> bool:
        """Parse SMTP_ENABLED from string to bool."""
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ("1", "true", "yes", "on")
        return bool(v)
    
    @field_validator("SMTP_USE_TLS", mode="before")
    @classmethod
    def parse_smtp_use_tls(cls, v) -> bool:
        """Parse SMTP_USE_TLS from string to bool."""
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ("1", "true", "yes", "on")
        return bool(v)
    
    @field_validator("COOKIE_SECURE", mode="before")
    @classmethod
    def parse_cookie_secure(cls, v) -> bool:
        """Parse COOKIE_SECURE from string to bool."""
        if isinstance(v, bool):
            return v
        if isinstance(v, str):
            return v.lower() in ("1", "true", "yes", "on")
        return bool(v)
    
    @field_validator("COOKIE_SAMESITE", mode="before")
    @classmethod
    def validate_cookie_samesite(cls, v) -> str:
        """Validate COOKIE_SAMESITE value."""
        if isinstance(v, str):
            v = v.lower()
            if v in ("strict", "lax", "none"):
                return v
        raise ValueError("COOKIE_SAMESITE must be 'strict', 'lax', or 'none'")


# Create settings instance - this will validate all env vars at import time
try:
    settings = Settings()
except Exception as e:
    import sys
    print(f"❌ Configuration validation failed: {e}", file=sys.stderr)
    print("Please check your .env file and ensure all required variables are set.", file=sys.stderr)
    sys.exit(1)

