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
                AccountType = registerDto.AccountType ?? "individual", // Default to individual if null
                ParentId = null // No parent for new regular accounts
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
                    ParentId = user.ParentId,
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
                    ParentId = user.ParentId,
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
                    ParentId = user.ParentId,
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
        [HttpPost("create-subaccount")]
        public async Task<ActionResult<AuthResponseDTO>> CreateSubaccount(CreateSubaccountDTO createSubaccountDto)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();
            
            var currentUser = await _context.Users.FindAsync(int.Parse(userId));
            if (currentUser == null)
                return NotFound("User not found");
            
            // Validate that only admins can create subaccounts
            if (currentUser.AccountType != "admin")
                return BadRequest("Only admin accounts can create subaccounts");
                
            // Check if username is already taken
            if (await _context.Users.AnyAsync(x => x.Username == createSubaccountDto.Username))
                return BadRequest("Username is already taken");
                
            // Check if email is already in use
            if (await _context.Users.AnyAsync(x => x.Email == createSubaccountDto.Email))
                return BadRequest("Email is already in use");
            
            // Create the subaccount
            var subaccount = new User
            {
                Username = createSubaccountDto.Username,
                Email = createSubaccountDto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(createSubaccountDto.Password),
                AccountType = "subaccount",
                ParentId = currentUser.Id
            };
            
            _context.Users.Add(subaccount);
            await _context.SaveChangesAsync();
            
            return new AuthResponseDTO
            {
                Token = _tokenService.CreateToken(subaccount),
                User = new UserDTO
                {
                    Id = subaccount.Id,
                    Username = subaccount.Username,
                    Email = subaccount.Email,
                    AccountType = subaccount.AccountType,
                    ParentId = subaccount.ParentId,
                    TwitterAccountsCount = 0,
                    DiscordAccountsCount = 0,
                    TelegramAccountsCount = 0
                }
            };
        }
        
        [Authorize]
        [HttpGet("subaccounts")]
        public async Task<ActionResult<List<UserDTO>>> GetSubaccounts()
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();
            
            var currentUser = await _context.Users.FindAsync(int.Parse(userId));
            if (currentUser == null)
                return NotFound("User not found");
            
            // Validate that only admins can view subaccounts
            if (currentUser.AccountType != "admin")
                return BadRequest("Only admin accounts can view subaccounts");
            
            // Get all subaccounts for this admin
            var subaccounts = await _context.Users
                .Where(u => u.ParentId == currentUser.Id)
                .Select(u => new UserDTO
                {
                    Id = u.Id,
                    Username = u.Username,
                    Email = u.Email,
                    AccountType = u.AccountType,
                    ParentId = u.ParentId,
                    TwitterAccountsCount = u.TwitterAccounts.Count,
                    DiscordAccountsCount = u.DiscordAccounts.Count,
                    TelegramAccountsCount = u.TelegramAccounts.Count
                })
                .ToListAsync();
                
            return subaccounts;
        }
        
        [Authorize]
        [HttpDelete("subaccounts/{id}")]
        public async Task<ActionResult> DeleteSubaccount(int id)
        {
            var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(userId))
                return Unauthorized();
            
            var currentUser = await _context.Users.FindAsync(int.Parse(userId));
            if (currentUser == null)
                return NotFound("User not found");
            
            // Validate that only admins can delete subaccounts
            if (currentUser.AccountType != "admin")
                return BadRequest("Only admin accounts can delete subaccounts");
            
            // Get the subaccount
            var subaccount = await _context.Users.FindAsync(id);
            if (subaccount == null)
                return NotFound("Subaccount not found");
            
            // Ensure this is actually a subaccount of the current user
            if (subaccount.ParentId != currentUser.Id || subaccount.AccountType != "subaccount")
                return BadRequest("This account is not a subaccount under your management");
            
            // Delete the subaccount
            _context.Users.Remove(subaccount);
            await _context.SaveChangesAsync();
            
            return Ok(new { message = "Subaccount deleted successfully" });
        }

        // Helper methods
        private bool IsValidAccountType(string accountType)
        {
            return accountType == "individual" || accountType == "admin" || accountType == "subaccount";
        }
    }
}