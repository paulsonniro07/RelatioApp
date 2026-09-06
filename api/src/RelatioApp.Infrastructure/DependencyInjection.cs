using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;

using RelatioApp.Application.Common.Interfaces;
using RelatioApp.Infrastructure.Files;
using RelatioApp.Infrastructure.Persistence;
using RelatioApp.Infrastructure.Persistence.Repositories;

namespace RelatioApp.Infrastructure;

public static class DependencyInjection
{
    public static IServiceCollection AddInfrastructure(
        this IServiceCollection services,
        IConfiguration configuration,
        string uploadsDirectory)
    {
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            // Local-dev fallback when ConnectionStrings__DefaultConnection is not set:
            // build from individual DB_* env vars (see .env.example).
            connectionString = $"Host={Get(configuration, "DB_HOST", "localhost")};" +
                $"Port={Get(configuration, "DB_PORT", "5432")};" +
                $"Database={Get(configuration, "DB_NAME", "relatioapp")};" +
                $"Username={Get(configuration, "DB_USER", "postgres")};" +
                $"Password={Get(configuration, "DB_PASSWORD", "")}";
        }

        services.AddDbContext<AppDbContext>(options =>
            options.UseNpgsql(connectionString)
                   .AddInterceptors(new AuditEntityInterceptor()));

        services.AddScoped(typeof(IGenericRepository<>), typeof(GenericRepository<>));
        services.AddScoped<IChartRepository, ChartRepository>();
        services.AddScoped<ITreeNodeRepository, TreeNodeRepository>();

        services.AddSingleton<IFileStorage>(new LocalFileStorage(uploadsDirectory));

        return services;
    }

    private static string Get(IConfiguration configuration, string key, string fallback)
        => configuration[key] ?? fallback;
}
