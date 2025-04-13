using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using SocialMediaManager.API.Data;
using SocialMediaManager.API.DTOs;
using SocialMediaManager.API.Models;
using SocialMediaManager.API.Services;
using System.Security.Claims;
using System.Collections.Generic;

namespace SocialMediaManager.API.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly TokenService _tokenService;
        
        public AuthController(ApplicationDbContext context, TokenService tokenService)
        {
            _context = context;
            _tokenService = tokenService;
        }
        
        [HttpPost("register")]
        public async Task<ActionResult<AuthResponseDTO>> Register(RegisterDTO registerDto)
        {
            if (await _context.Users.AnyAsync(x => x.Username == registerDto.Username))
                return BadRequest("Username is already taken");
                
            if (await _context.Users.AnyAsync(x => x.Email == registerDto.Email))
                return BadRequest("Email is already in use");
            
            // Validate account type
            if (!IsValidAccountType(registerDto.AccountType))
                return BadRequest("Invalid account type");
            
            var user = new User
            {
                Username = registerDto.Username,
                Email = registerDto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password),
                AccountType = registerDto.AccountType ?? "basic" // Default to basic if null
            };
            
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            
            return new AuthResponseDTO
            {
                Token = _tokenService.CreateToken(user),
                User = new UserDTO
                {
                    Id = user.Id,
                    Username = user.Username,
                    Email = user.Email,
                    AccountType = user.AccountType,
                    TwitterAccountsCount = 0,
                    DiscordAccountsCount = 0,
                    TelegramAccountsCount = 0
                }
            };
        }
        
        [HttpPost("login")]
        public async Task<ActionResult<AuthResponseDTO>> Login(LoginDTO loginDto)
        {
            var user = await _context.Users
                .Include(u => u.TwitterAccounts)
                .Include(u => u.DiscordAccounts)
                .Include(u => u.TelegramAccounts)
                .SingleOrDefaultAsync(x => x.Username == loginDto.Username);
            
            if (user == null)
                return Unauthorized("Invalid username");
            
            var isPasswordValid = BCrypt.Net.BCrypt.Verify(loginDto.Password, user.PasswordHash);
            
            if (!isPasswordValid)
                return Unauthorized("Invalid password");
            
            return new AuthResponseDTO
            {
                Token = _tokenService.CreateToken(user),
                User = new UserDTO
                {
                    Id = user.Id,
                    Username = user.Username,
                    Email = user.Email,
                    AccountType = user.AccountType,
                    TwitterAccountsCount = user.TwitterAccounts?.Count ?? 0,
                    DiscordAccountsCount = user.DiscordAccounts?.Count ?? 0,
                    TelegramAccountsCount = user.TelegramAccounts?.Count ?? 0
                }
            };
        }

        [Authorize]
        [HttpPut("profile")]
        public async Task<ActionResult<AuthResponseDTO>> UpdateProfile(UpdateProfileDTO updateProfileDto)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var user = await _context.Users
                .Include(u => u.TwitterAccounts)
                .Include(u => u.DiscordAccounts)
                .Include(u => u.TelegramAccounts)
                .SingleOrDefaultAsync(x => x.Id == int.Parse(userId));

            if (user == null)
                return NotFound("User not found");

            // Check if username already exists (if changing username)
            if (updateProfileDto.Username != user.Username)
            {
                if (await _context.Users.AnyAsync(x => x.Username == updateProfileDto.Username))
                    return BadRequest("Username is already taken");
                user.Username = updateProfileDto.Username;
            }

            // Check if email already exists (if changing email)
            if (updateProfileDto.Email != user.Email)
            {
                if (await _context.Users.AnyAsync(x => x.Email == updateProfileDto.Email))
                    return BadRequest("Email is already in use");
                user.Email = updateProfileDto.Email;
            }

            await _context.SaveChangesAsync();

            return new AuthResponseDTO
            {
                Token = _tokenService.CreateToken(user),
                User = new UserDTO
                {
                    Id = user.Id,
                    Username = user.Username,
                    Email = user.Email,
                    AccountType = user.AccountType,
                    TwitterAccountsCount = user.TwitterAccounts?.Count ?? 0,
                    DiscordAccountsCount = user.DiscordAccounts?.Count ?? 0,
                    TelegramAccountsCount = user.TelegramAccounts?.Count ?? 0
                }
            };
        }

        [Authorize]
        [HttpPut("change-password")]
        public async Task<ActionResult> ChangePassword(ChangePasswordDTO changePasswordDto)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var user = await _context.Users.FindAsync(int.Parse(userId));
            if (user == null)
                return NotFound("User not found");

            // Verify current password
            var isCurrentPasswordValid = BCrypt.Net.BCrypt.Verify(changePasswordDto.CurrentPassword, user.PasswordHash);
            if (!isCurrentPasswordValid)
                return BadRequest("Current password is incorrect");

            // Update password
            user.PasswordHash = BCrypt.Net.BCrypt.HashPassword(changePasswordDto.NewPassword);
            await _context.SaveChangesAsync();

            return Ok(new { message = "Password changed successfully" });
        }

        [Authorize]
        [HttpPut("account-type")]
        public async Task<ActionResult<AuthResponseDTO>> UpdateAccountType(UpdateAccountTypeDTO updateAccountTypeDto)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();

            var user = await _context.Users
                .Include(u => u.TwitterAccounts)
                .Include(u => u.DiscordAccounts)
                .Include(u => u.TelegramAccounts)
                .SingleOrDefaultAsync(x => x.Id == int.Parse(userId));

            if (user == null)
                return NotFound("User not found");

            // Validate account type
            if (!IsValidAccountType(updateAccountTypeDto.AccountType))
                return BadRequest("Invalid account type");

            // Check if user can downgrade (would they exceed their account limit?)
            if (IsDowngrade(user.AccountType, updateAccountTypeDto.AccountType))
            {
                int accountLimit = GetAccountLimit(updateAccountTypeDto.AccountType);
                int currentAccountsCount = (user.TwitterAccounts?.Count ?? 0) + 
                                          (user.DiscordAccounts?.Count ?? 0) + 
                                          (user.TelegramAccounts?.Count ?? 0);
                
                if (accountLimit != -1 && currentAccountsCount > accountLimit) // -1 means unlimited
                {
                    return BadRequest($"Cannot downgrade. You have {currentAccountsCount} connected accounts, but the {updateAccountTypeDto.AccountType} plan only allows {accountLimit}.");
                }
            }

            // Update account type
            user.AccountType = updateAccountTypeDto.AccountType;
            await _context.SaveChangesAsync();

            return new AuthResponseDTO
            {
                Token = _tokenService.CreateToken(user),
                User = new UserDTO
                {
                    Id = user.Id,
                    Username = user.Username,
                    Email = user.Email,
                    AccountType = user.AccountType,
                    TwitterAccountsCount = user.TwitterAccounts?.Count ?? 0,
                    DiscordAccountsCount = user.DiscordAccounts?.Count ?? 0,
                    TelegramAccountsCount = user.TelegramAccounts?.Count ?? 0
                }
            };
        }

        // Helper methods
        private bool IsValidAccountType(string accountType)
        {
            return accountType == "basic" || accountType == "business" || accountType == "premium";
        }

        private bool IsDowngrade(string currentType, string newType)
        {
            var hierarchy = new Dictionary<string, int>
            {
                { "basic", 1 },
                { "business", 2 },
                { "premium", 3 }
            };

            return hierarchy[newType] < hierarchy[currentType];
        }

        private int GetAccountLimit(string accountType)
        {
            switch (accountType)
            {
                case "basic":
                    return 3;
                case "business":
                    return 10;
                case "premium":
                    return -1; // Unlimited
                default:
                    return 3;
            }
        }
    }
}