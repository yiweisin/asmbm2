using System;
using System.Collections.Generic;
using System.Net.Http;
using System.Text;
using System.Text.Json;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace SocialMediaManager.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    [Authorize]
    public class AIController : ControllerBase
    {
        private readonly IConfiguration _configuration;
        private readonly ILogger<AIController> _logger;
        private readonly HttpClient _httpClient;
        private readonly string _geminiApiKey;
        
        public AIController(
            IConfiguration configuration,
            ILogger<AIController> logger,
            IHttpClientFactory httpClientFactory)
        {
            _configuration = configuration;
            _logger = logger;
            _httpClient = httpClientFactory.CreateClient();
            _geminiApiKey = _configuration["Gemini:ApiKey"];
        }
        
        [HttpPost("generate")]
        public async Task<IActionResult> GenerateText([FromBody] TextGenerationRequestDTO request)
        {
            if (string.IsNullOrEmpty(request.Prompt))
            {
                return BadRequest("Prompt cannot be empty");
            }
            
            try
            {
                // Create a direct prompt based on platform
                string platformPrompt = string.Empty;
                
                switch (request.Platform?.ToLower())
                {
                    case "twitter":
                        platformPrompt = "Generate a Twitter post (maximum 280 characters) without any explanations or options. The post should include relevant hashtags. Just generate one post directly: ";
                        break;
                    case "discord":
                        platformPrompt = "Generate a Discord message without any explanations or options. Just generate one message directly: ";
                        break;
                    case "telegram":
                        platformPrompt = "Generate a Telegram message without any explanations or options. Just generate one message directly: ";
                        break;
                    default:
                        platformPrompt = "Generate a social media post without any explanations or options. Just generate one post directly: ";
                        break;
                }
                
                // Combine with user prompt
                string fullPrompt = platformPrompt + request.Prompt;
                
                // Set up Gemini request using the format from the curl example
                var geminiUrl = $"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key={_geminiApiKey}";
                
                var requestBody = new
                {
                    contents = new[]
                    {
                        new
                        {
                            parts = new[]
                            {
                                new { text = fullPrompt }
                            }
                        }
                    }
                };
                
                _logger.LogInformation($"Sending request to Gemini API");
                
                var requestContent = new StringContent(
                    JsonSerializer.Serialize(requestBody),
                    Encoding.UTF8,
                    "application/json");
                
                // Make request to Gemini API
                var response = await _httpClient.PostAsync(geminiUrl, requestContent);
                
                if (!response.IsSuccessStatusCode)
                {
                    var errorContent = await response.Content.ReadAsStringAsync();
                    _logger.LogError($"Gemini API error: {errorContent}");
                    return StatusCode((int)response.StatusCode, $"Error from AI service: {response.StatusCode}");
                }
                
                // Parse response
                var responseContent = await response.Content.ReadAsStringAsync();
                _logger.LogInformation($"Received response from Gemini API");
                
                var responseData = JsonSerializer.Deserialize<JsonElement>(responseContent);
                
                // Extract the generated text from Gemini's response format
                string generatedText = string.Empty;
                
                try {
                    generatedText = responseData
                        .GetProperty("candidates")[0]
                        .GetProperty("content")
                        .GetProperty("parts")[0]
                        .GetProperty("text")
                        .GetString()
                        .Trim();
                } 
                catch (Exception ex) 
                {
                    _logger.LogError($"Error parsing Gemini response: {ex.Message}. Response content: {responseContent}");
                    
                    // Fallback parsing approach
                    try {
                        var candidates = responseData.GetProperty("candidates");
                        var firstCandidate = candidates[0];
                        var content = firstCandidate.GetProperty("content");
                        var parts = content.GetProperty("parts");
                        var firstPart = parts[0];
                        generatedText = firstPart.GetProperty("text").GetString().Trim();
                    }
                    catch {
                        throw new Exception($"Failed to parse Gemini API response: {responseContent}");
                    }
                }
                
                if (string.IsNullOrEmpty(generatedText)) {
                    return StatusCode(500, "Received empty response from AI service");
                }
                
                return Ok(new TextGenerationResponseDTO
                {
                    GeneratedText = generatedText
                });
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error generating text with Gemini");
                return StatusCode(500, "Error generating text with AI: " + ex.Message);
            }
        }
    }
    
    public class TextGenerationRequestDTO
    {
        public string Prompt { get; set; }
        public string Platform { get; set; } // Optional: twitter, discord, telegram
        public int MaxLength { get; set; } = 1024; // Default max output tokens
    }
    
    public class TextGenerationResponseDTO
    {
        public string GeneratedText { get; set; }
    }
}