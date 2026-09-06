using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.FileProviders;

using RelatioApp.API.Middleware;
using RelatioApp.Application;
using RelatioApp.Infrastructure;
using RelatioApp.Infrastructure.Persistence;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddEndpointsApiExplorer();
builder.Services.AddSwaggerGen();

builder.Services.AddApplication();

// Uploaded photos live on the local filesystem (mounted volume in Docker) and are
// served back under /api/uploads/... — the client nginx already proxies /api/.
var uploadsDirectory = Path.GetFullPath(
    builder.Configuration["Uploads:Directory"] ?? "uploads",
    builder.Environment.ContentRootPath);
Directory.CreateDirectory(uploadsDirectory);

builder.Services.AddInfrastructure(builder.Configuration, uploadsDirectory);

builder.Services.AddCors(options =>
{
    options.AddPolicy("Client", policy =>
        policy
            .WithOrigins("http://localhost:3000", "http://localhost:5173")
            .AllowAnyHeader()
            .AllowAnyMethod());
});

var app = builder.Build();

// Turnkey startup: apply any pending EF migrations (idempotent). Makes
// `docker compose up` work with a fresh database — no manual step needed.
using (var scope = app.Services.CreateScope())
{
    var db = scope.ServiceProvider.GetRequiredService<AppDbContext>();
    await db.Database.MigrateAsync();
}

if (app.Environment.IsDevelopment())
{
    app.UseSwagger();
    app.UseSwaggerUI();
}

app.UseMiddleware<GlobalExceptionMiddleware>();
app.UseCors("Client");

// Serve uploaded node photos under the /api prefix the client already uses.
app.UseStaticFiles(new StaticFileOptions
{
    FileProvider = new PhysicalFileProvider(uploadsDirectory),
    RequestPath = "/api/uploads",
});

app.MapControllers();

app.Run();

public partial class Program;

