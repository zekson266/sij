"""
OpenAI service for generating AI-powered field suggestions.

Handles API calls to OpenAI and calculates costs based on token usage.
"""

import json
import logging
from typing import Dict, List, Optional, Any

from openai import OpenAI

from app.config import settings

logger = logging.getLogger(__name__)


class OpenAIService:
    """
    Service for interacting with OpenAI API to generate field suggestions.
    
    Handles prompt engineering, API calls, response parsing, and cost calculation.
    """
    
    def __init__(self):
        """Initialize OpenAI client with API key from settings."""
        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY is not set in environment variables")
        
        self.client = OpenAI(api_key=settings.OPENAI_API_KEY)
        self.model = settings.OPENAI_MODEL
        self.max_tokens = settings.OPENAI_MAX_TOKENS
        self.temperature = settings.OPENAI_TEMPERATURE
    
    def suggest_field_value(
        self,
        field_name: str,
        field_type: str,
        field_label: str,
        current_value: str,
        form_data: Dict,
        field_options: Optional[List[str]] = None,
        field_metadata: Optional[Any] = None,
        parent_context: Optional[Dict] = None
    ) -> Dict:
        """
        Generate AI suggestion for a form field.
        
        Args:
            field_name: Name of the field (e.g., "description")
            field_type: Type of field (text, select, multi-select, boolean, etc.)
            field_label: Human-readable label for the field
            current_value: Current value of the field (may be empty)
            form_data: All form fields as context
            field_options: Available options for select/multi-select fields
            field_metadata: Optional FieldMetadata object with examples, hints, etc.
            parent_context: Optional dictionary with parent entity context (repository_context, activity_context, etc.)
            
        Returns:
            Dictionary containing:
                - general_statement: Explanation/reasoning
                - suggestions: List of suggested values
                - model: Model used
                - tokens_used: Total tokens consumed
                - cost_usd: Cost in USD
        """
        """
        Generate AI suggestion for a form field.
        
        Args:
            field_name: Name of the field (e.g., "description")
            field_type: Type of field (text, select, multi-select, boolean, etc.)
            field_label: Human-readable label for the field
            current_value: Current value of the field (may be empty)
            form_data: All form fields as context
            field_options: Available options for select/multi-select fields
            field_metadata: Optional FieldMetadata object with examples, hints, etc.
            parent_context: Optional dictionary with parent entity context (repository_context, activity_context, etc.)
            
        Returns:
            Dictionary containing:
                - general_statement: Explanation/reasoning
                - suggestions: List of suggested values
                - model: Model used
                - tokens_used: Total tokens consumed
                - cost_usd: Cost in USD
        """
        try:
            # Build prompt
            prompt = self._build_prompt(
                field_name=field_name,
                field_type=field_type,
                field_label=field_label,
                current_value=current_value,
                form_data=form_data,
                field_options=field_options,
                field_metadata=field_metadata,
                parent_context=parent_context
            )
            
            # Debug: Log if repository context is in prompt
            if parent_context and "repository_context" in parent_context:
                if "Parent Repository Context" in prompt or "repository" in prompt.lower():
                    logger.info(f"[OPENAI] Repository context IS in prompt (found 'Parent Repository Context' or 'repository')")
                else:
                    logger.warning(f"[OPENAI] WARNING: Repository context NOT found in prompt text!")
            
            # Call OpenAI API
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": self._get_system_prompt()
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=self.temperature,
                max_tokens=self.max_tokens
            )
            
            # Parse response
            result = self._parse_response(response.choices[0].message.content, field_type)
            
            # Calculate cost
            cost = self._calculate_cost(
                model=self.model,
                prompt_tokens=response.usage.prompt_tokens,
                completion_tokens=response.usage.completion_tokens
            )
            
            return {
                "general_statement": result.get("general_statement", ""),
                "suggestions": result.get("suggestions", []),
                "model": self.model,
                "tokens_used": response.usage.total_tokens,
                "cost_usd": cost
            }
            
        except Exception as e:
            logger.error(f"OpenAI API error: {str(e)}", exc_info=True)
            raise
    
    def _get_system_prompt(self) -> str:
        """Get system prompt for the AI assistant."""
        return """You are an expert data governance and compliance consultant specializing in GDPR, data protection, and Record of Processing Activities (ROPA).

Your task is to provide helpful, accurate, and contextually appropriate suggestions for filling out data repository forms. 

Guidelines:
- Provide professional, concise suggestions based on the form context
- Consider industry best practices and compliance requirements
- Always provide a brief general statement explaining your reasoning
- Then provide exact suggestion(s) that can be directly used

CRITICAL RULES:
- For single-value fields (text, textarea, select, enum, multiline): You MUST provide EXACTLY ONE suggestion in the array
- For multiselect fields: You may provide multiple suggestions (typically 2-5 items), each as a separate array element

Format your response as JSON:
{
  "general_statement": "Brief explanation of the suggestion",
  "suggestions": ["single_suggestion"]  // For single-value fields: EXACTLY ONE item
}

OR for multiselect fields:
{
  "general_statement": "Brief explanation",
  "suggestions": ["item1", "item2", "item3"]  // For multiselect: Multiple items, each separate
}

IMPORTANT: The number of suggestions in the array must match the field type requirement."""
    
    def _build_prompt(
        self,
        field_name: str,
        field_type: str,
        field_label: str,
        current_value: str,
        form_data: Dict,
        field_options: Optional[List[str]] = None,
        field_metadata: Optional[Any] = None,
        parent_context: Optional[Dict] = None
    ) -> str:
        """Build the user prompt with form context, metadata, and parent entity context."""
        prompt_parts = [
            f"I need a suggestion for the field: '{field_label}' (field name: {field_name})",
            f"Field type: {field_type}",
        ]
        
        # Add field description from metadata if available
        if field_metadata and hasattr(field_metadata, 'description'):
            prompt_parts.append(f"\nField description: {field_metadata.description}")
        
        if current_value:
            prompt_parts.append(f"Current value: {current_value}")
        else:
            prompt_parts.append("Current value: (empty)")
        
        if field_options:
            prompt_parts.append(f"Available options: {', '.join(field_options)}")
        
        # Add examples from metadata if available
        if field_metadata and hasattr(field_metadata, 'examples') and field_metadata.examples:
            prompt_parts.append(f"\nExample values for this field:")
            for example in field_metadata.examples[:5]:  # Limit to 5 examples to avoid token bloat
                prompt_parts.append(f"  - {example}")
        
        # Add AI hints from metadata if available
        if field_metadata and hasattr(field_metadata, 'ai_hints') and field_metadata.ai_hints:
            prompt_parts.append(f"\nGuidance for this field: {field_metadata.ai_hints}")
        
        # Add parent entity context (repository, activity, dpia, etc.)
        if parent_context:
            # Emphasize repository context if present (important for activity suggestions)
            if "repository_context" in parent_context:
                repo_ctx = parent_context["repository_context"]
                prompt_parts.append("\n=== IMPORTANT: Parent Repository Context ===")
                prompt_parts.append("Use this repository information to inform your suggestions:")
                if repo_ctx.get("data_repository_name"):
                    prompt_parts.append(f"  - Repository Name: {repo_ctx['data_repository_name']}")
                if repo_ctx.get("data_repository_description"):
                    prompt_parts.append(f"  - Repository Description: {repo_ctx['data_repository_description']}")
                if repo_ctx.get("external_vendor"):
                    prompt_parts.append(f"  - Vendor: {repo_ctx['external_vendor']}")
                if repo_ctx.get("geographical_location_ids"):
                    locations = repo_ctx.get("geographical_location_ids")
                    if locations:
                        if isinstance(locations, list):
                            prompt_parts.append(f"  - Geographic Regions: {len(locations)} selected")
                        else:
                            prompt_parts.append("  - Geographic Regions: selected")
                if repo_ctx.get("gdpr_compliant") is not None:
                    prompt_parts.append(f"  - GDPR Compliant: {repo_ctx['gdpr_compliant']}")
                if repo_ctx.get("data_format"):
                    prompt_parts.append(f"  - Data Format: {repo_ctx['data_format']}")
                if repo_ctx.get("transfer_mechanism"):
                    prompt_parts.append(f"  - Transfer Mechanism: {repo_ctx['transfer_mechanism']}")
                if repo_ctx.get("certification"):
                    prompt_parts.append(f"  - Certification: {repo_ctx['certification']}")
                if repo_ctx.get("status"):
                    prompt_parts.append(f"  - Status: {repo_ctx['status']}")
                prompt_parts.append("")  # Empty line after repository context
            
            if "activity_context" in parent_context:
                activity_ctx = parent_context["activity_context"]
                prompt_parts.append("\nParent Activity Context:")
                if activity_ctx.get("name"):
                    prompt_parts.append(f"  - Activity Name: {activity_ctx['name']}")
                if activity_ctx.get("description"):
                    prompt_parts.append(f"  - Activity Description: {activity_ctx['description']}")
                if activity_ctx.get("purpose"):
                    prompt_parts.append(f"  - Purpose: {activity_ctx['purpose']}")
                if activity_ctx.get("lawful_basis"):
                    prompt_parts.append(f"  - Lawful Basis: {activity_ctx['lawful_basis']}")
                if activity_ctx.get("business_function"):
                    prompt_parts.append(f"  - Business Function: {activity_ctx['business_function']}")
                if activity_ctx.get("processing_owner"):
                    prompt_parts.append(f"  - Processing Owner: {activity_ctx['processing_owner']}")
                if activity_ctx.get("processing_status"):
                    prompt_parts.append(f"  - Processing Status: {activity_ctx['processing_status']}")
            
            if "dpia_context" in parent_context:
                dpia_ctx = parent_context["dpia_context"]
                prompt_parts.append("\nParent DPIA Context:")
                if dpia_ctx.get("title"):
                    prompt_parts.append(f"  - DPIA Title: {dpia_ctx['title']}")
                if dpia_ctx.get("description"):
                    prompt_parts.append(f"  - DPIA Description: {dpia_ctx['description']}")
                if dpia_ctx.get("status"):
                    prompt_parts.append(f"  - DPIA Status: {dpia_ctx['status']}")
            
            if "company_context" in parent_context:
                company_ctx = parent_context["company_context"]
                prompt_parts.append("\nCompany Context:")
                if company_ctx.get("industry"):
                    prompt_parts.append(f"  - Industry: {company_ctx['industry']}")
                if company_ctx.get("sector"):
                    prompt_parts.append(f"  - Sector: {company_ctx['sector']}")
                if company_ctx.get("legal_jurisdiction"):
                    jurisdictions = company_ctx["legal_jurisdiction"]
                    if isinstance(jurisdictions, list):
                        prompt_parts.append(f"  - Legal Jurisdictions: {', '.join(jurisdictions)}")
                    else:
                        prompt_parts.append(f"  - Legal Jurisdiction: {jurisdictions}")
                if company_ctx.get("company_size"):
                    prompt_parts.append(f"  - Company Size: {company_ctx['company_size']}")
                if company_ctx.get("primary_country"):
                    prompt_parts.append(f"  - Primary Country: {company_ctx['primary_country']}")
                if company_ctx.get("compliance_frameworks"):
                    frameworks = company_ctx["compliance_frameworks"]
                    if isinstance(frameworks, list):
                        prompt_parts.append(f"  - Compliance Frameworks: {', '.join(frameworks)}")
                    else:
                        prompt_parts.append(f"  - Compliance Framework: {frameworks}")
                if company_ctx.get("dpo"):
                    dpo = company_ctx["dpo"]
                    dpo_info = []
                    if dpo.get("name"):
                        dpo_info.append(f"Name: {dpo['name']}")
                    if dpo.get("email"):
                        dpo_info.append(f"Email: {dpo['email']}")
                    if dpo_info:
                        prompt_parts.append(f"  - DPO: {', '.join(dpo_info)}")
        
        # Add relevant form context (filter out empty values for clarity)
        relevant_context = {
            k: v for k, v in form_data.items()
            if v and k != field_name  # Exclude the field being suggested
        }
        
        if relevant_context:
            prompt_parts.append("\nForm context (other fields already filled):")
            for key, value in relevant_context.items():
                if isinstance(value, (str, int, float, bool)):
                    prompt_parts.append(f"  - {key}: {value}")
                elif isinstance(value, list):
                    prompt_parts.append(f"  - {key}: {', '.join(map(str, value))}")
        
        # Add explicit instruction based on field type
        if field_type in ['text', 'select', 'textarea', 'multiline', 'enum']:
            prompt_parts.append(
                "\nIMPORTANT: This field accepts only a SINGLE value. "
                "Provide exactly ONE suggestion."
            )
        elif field_type == 'multiselect':
            prompt_parts.append(
                "\nThis field accepts multiple values. "
                "You may provide multiple suggestions (typically 2-5 items)."
            )
            prompt_parts.append(
                "\nCRITICAL FORMAT REQUIREMENT: "
                "You MUST return each suggestion as a SEPARATE array element. "
                "DO NOT put multiple values in a single string with commas. "
                "\n"
                "CORRECT format: ['US', 'GB', 'DE'] - each country is a separate string in the array"
                "\n"
                "WRONG formats:"
                "\n  - ['US, GB, DE'] - single string with commas (WRONG!)"
                "\n  - 'US, GB, DE' - not an array (WRONG!)"
                "\n"
                "Each country/region must be its own separate string element in the suggestions array."
            )
        
        prompt_parts.append("\nPlease provide a suggestion for this field based on the context above.")
        
        return "\n".join(prompt_parts)
    
    def _parse_response(self, content: str, field_type: str) -> Dict:
        """
        Parse OpenAI response to extract general_statement and suggestions.
        
        Handles both JSON and plain text responses.
        Args:
            content: Raw response content from OpenAI
            field_type: Type of field (text, multiselect, etc.) - used for fallback parsing
        """
        try:
            # Try to parse as JSON first
            # Sometimes response is wrapped in markdown code blocks
            content = content.strip()
            if content.startswith("```json"):
                content = content[7:]  # Remove ```json
            if content.startswith("```"):
                content = content[3:]  # Remove ```
            if content.endswith("```"):
                content = content[:-3]  # Remove closing ```
            content = content.strip()
            
            result = json.loads(content)
            
            # Validate structure
            if not isinstance(result, dict):
                raise ValueError("Response is not a dictionary")
            
            general_statement = result.get("general_statement", "")
            suggestions = result.get("suggestions", [])
            
            # Ensure suggestions is a list
            if not isinstance(suggestions, list):
                suggestions = [suggestions] if suggestions else []
            
            return {
                "general_statement": general_statement,
                "suggestions": suggestions
            }
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.warning(f"Failed to parse JSON response: {e}. Content: {content}")
            # Fallback: treat entire response as general statement
            # Try to extract suggestions from text
            lines = content.split("\n")
            suggestions = []
            general_statement = content
            
            # Look for bullet points or numbered lists
            for line in lines:
                line = line.strip()
                if line.startswith("- ") or line.startswith("* ") or line.startswith("• "):
                    suggestion = line[2:].strip()
                    if suggestion:
                        suggestions.append(suggestion)
                elif line and line[0].isdigit() and ". " in line:
                    suggestion = line.split(". ", 1)[1].strip()
                    if suggestion:
                        suggestions.append(suggestion)
            
            # For single-value fields, limit to first suggestion in fallback
            if field_type in ['text', 'select', 'textarea', 'multiline', 'enum']:
                if suggestions:
                    suggestions = [suggestions[0]]
                elif not suggestions:
                    # If no suggestions found, use entire content as single suggestion
                    suggestions = [content]
            
            return {
                "general_statement": general_statement,
                "suggestions": suggestions if suggestions else [content]
            }
    
    def _calculate_cost(self, model: str, prompt_tokens: int, completion_tokens: int) -> float:
        """
        Calculate cost based on OpenAI pricing (as of 2024).
        
        Pricing (per 1M tokens):
        - gpt-4o-mini: $0.15 input, $0.60 output
        - gpt-4o: $2.50 input, $10.00 output
        
        Returns cost in USD rounded to 6 decimal places.
        """
        pricing = {
            "gpt-4o-mini": {
                "input": 0.15 / 1_000_000,  # $0.15 per 1M tokens
                "output": 0.60 / 1_000_000   # $0.60 per 1M tokens
            },
            "gpt-4o": {
                "input": 2.50 / 1_000_000,   # $2.50 per 1M tokens
                "output": 10.00 / 1_000_000  # $10.00 per 1M tokens
            }
        }
        
        if model not in pricing:
            logger.warning(f"Unknown model {model}, cost calculation may be inaccurate")
            return 0.0
        
        cost = (
            prompt_tokens * pricing[model]["input"] +
            completion_tokens * pricing[model]["output"]
        )
        
        return round(cost, 6)


