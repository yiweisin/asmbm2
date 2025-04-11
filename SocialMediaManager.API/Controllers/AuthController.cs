using System;
using System.Linq;
using System.Security.Cryptography;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using SocialMediaManager.API.Data;
using SocialMediaManager.API.DTOs;
using SocialMediaManager.API.Models;
using SocialMediaManager.API.Services;

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
            
            using var hmac = new HMACSHA512();
            
            var user = new User
            {
                Username = registerDto.Username,
                Email = registerDto.Email,
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(registerDto.Password)
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
                    TwitterAccountsCount = user.TwitterAccounts?.Count ?? 0,
                    DiscordAccountsCount = user.DiscordAccounts?.Count ?? 0,
                    TelegramAccountsCount = user.TelegramAccounts?.Count ?? 0
                }
            };
        }
    }
}