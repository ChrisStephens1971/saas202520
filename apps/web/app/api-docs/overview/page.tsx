/**
 * API Documentation Overview Page
 *
 * Comprehensive guide for developers to get started with the Tournament Platform API
 */

export default function ApiOverviewPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16 px-8">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-4xl font-bold mb-4">Tournament Platform API Documentation</h1>
          <p className="text-xl text-blue-100">
            Build powerful integrations with our RESTful API. Access tournament data, player
            statistics, and real-time event notifications.
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto py-12 px-8">
        {/* Getting Started */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Getting Started</h2>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">1. Get Your API Key</h3>
            <p className="text-gray-600 mb-4">
              To access the API, you&apos;ll need an API key. Sign up for an account and generate
              your key from the{' '}
              <a href="/developer" className="text-blue-600 hover:underline">
                developer portal
              </a>
              .
            </p>
            <div className="bg-gray-50 rounded p-4 font-mono text-sm">
              API Key Format: <span className="text-blue-600">sk_live_...</span>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">2. Authentication</h3>
            <p className="text-gray-600 mb-4">
              Include your API key in the Authorization header of every request:
            </p>
            <div className="bg-gray-900 text-gray-100 rounded p-4 overflow-x-auto">
              <pre className="text-sm">{`Authorization: Bearer YOUR_API_KEY`}</pre>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-xl font-semibold text-gray-900 mb-4">3. Rate Limits</h3>
            <p className="text-gray-600 mb-4">
              API requests are rate-limited based on your plan tier:
            </p>
            <ul className="space-y-2 text-gray-700">
              <li className="flex items-center">
                <span className="w-32 font-semibold">Free Tier:</span>
                <span>100 requests/hour</span>
              </li>
              <li className="flex items-center">
                <span className="w-32 font-semibold">Pro Tier:</span>
                <span>1,000 requests/hour</span>
              </li>
              <li className="flex items-center">
                <span className="w-32 font-semibold">Enterprise:</span>
                <span>10,000 requests/hour</span>
              </li>
            </ul>
            <p className="text-gray-600 mt-4 text-sm">
              Rate limit information is included in response headers:
              <code className="bg-gray-100 px-2 py-1 rounded text-xs ml-2">X-RateLimit-Limit</code>,
              <code className="bg-gray-100 px-2 py-1 rounded text-xs ml-2">
                X-RateLimit-Remaining
              </code>
              ,<code className="bg-gray-100 px-2 py-1 rounded text-xs ml-2">X-RateLimit-Reset</code>
            </p>
          </div>
        </section>

        {/* Quick Start Guide */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Quick Start Examples</h2>

          {/* JavaScript Example */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm mr-3">
                JavaScript
              </span>
              Fetch Tournament List
            </h3>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-6 overflow-x-auto">
              <pre className="text-sm">
                {`// Using fetch API
const apiKey = 'YOUR_API_KEY_HERE';

async function getTournaments() {
  const response = await fetch('https://api.tournament-platform.com/v1/tournaments', {
    headers: {
      'Authorization': \`Bearer \${apiKey}\`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(\`HTTP error! status: \${response.status}\`);
  }

  const data = await response.json();
  console.log('Tournaments:', data.data);
  console.log('Total:', data.meta.total);

  return data;
}

getTournaments()
  .then(data => console.log('Success:', data))
  .catch(error => console.error('Error:', error));`}
              </pre>
            </div>
          </div>

          {/* Python Example */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm mr-3">
                Python
              </span>
              Get Player Profile
            </h3>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-6 overflow-x-auto">
              <pre className="text-sm">
                {`import requests

API_KEY = 'YOUR_API_KEY_HERE'
BASE_URL = 'https://api.tournament-platform.com/v1'

headers = {
    'Authorization': f'Bearer {API_KEY}',
    'Content-Type': 'application/json'
}

def get_leaderboard(type='win-rate', limit=100):
    """Fetch global leaderboard"""
    response = requests.get(
        f'{BASE_URL}/leaderboards',
        headers=headers,
        params={'type': type, 'limit': limit}
    )

    response.raise_for_status()
    data = response.json()

    print(f"Top {len(data['data'])} players by {type}:")
    for entry in data['data'][:10]:
        print(f"#{entry['rank']}: {entry['player']['name']} - {entry['metric_value']}")

    return data

# Fetch leaderboard
leaderboard = get_leaderboard('win-rate', 50)`}
              </pre>
            </div>
          </div>

          {/* cURL Example */}
          <div className="mb-8">
            <h3 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <span className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm mr-3">
                cURL
              </span>
              Get Venue Tournaments
            </h3>
            <div className="bg-gray-900 text-gray-100 rounded-lg p-6 overflow-x-auto">
              <pre className="text-sm">
                {`# Get all tournaments at a specific venue
curl -X GET "https://api.tournament-platform.com/v1/venues/venue-123/tournaments?status=active&page=1&limit=20" \\
  -H "Authorization: Bearer YOUR_API_KEY_HERE" \\
  -H "Content-Type: application/json"

# Response includes tournament list and pagination metadata
# {
#   "data": [
#     {
#       "id": "tournament-456",
#       "name": "Championship Finals",
#       "format": "single_elimination",
#       "status": "active",
#       "start_date": "2025-11-10T18:00:00Z",
#       "player_count": 32
#     }
#   ],
#   "meta": {
#     "page": 1,
#     "limit": 20,
#     "total": 5,
#     "total_pages": 1,
#     "venue_id": "venue-123"
#   }
# }`}
              </pre>
            </div>
          </div>
        </section>

        {/* Endpoints Reference */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Available Endpoints</h2>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 divide-y divide-gray-200">
            {/* Leaderboards */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Leaderboards</h3>
              <ul className="space-y-2">
                <li>
                  <code className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm mr-2">
                    GET
                  </code>
                  <code className="text-gray-700">/leaderboards</code>
                  <span className="text-gray-500 ml-2">- Global player rankings</span>
                </li>
                <li>
                  <code className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm mr-2">
                    GET
                  </code>
                  <code className="text-gray-700">/leaderboards/venue/:id</code>
                  <span className="text-gray-500 ml-2">- Venue-specific rankings</span>
                </li>
                <li>
                  <code className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm mr-2">
                    GET
                  </code>
                  <code className="text-gray-700">/leaderboards/format/:format</code>
                  <span className="text-gray-500 ml-2">- Format-specific rankings</span>
                </li>
              </ul>
            </div>

            {/* Venues */}
            <div className="p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Venues</h3>
              <ul className="space-y-2">
                <li>
                  <code className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm mr-2">
                    GET
                  </code>
                  <code className="text-gray-700">/venues</code>
                  <span className="text-gray-500 ml-2">- List all venues</span>
                </li>
                <li>
                  <code className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm mr-2">
                    GET
                  </code>
                  <code className="text-gray-700">/venues/:id</code>
                  <span className="text-gray-500 ml-2">- Get venue details</span>
                </li>
                <li>
                  <code className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm mr-2">
                    GET
                  </code>
                  <code className="text-gray-700">/venues/:id/tournaments</code>
                  <span className="text-gray-500 ml-2">- Tournaments at venue</span>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 text-center">
            <a
              href="/api-docs"
              className="inline-flex items-center px-6 py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition"
            >
              View Interactive API Reference →
            </a>
          </div>
        </section>

        {/* Best Practices */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Best Practices</h2>

          <div className="space-y-4">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Handling</h3>
              <p className="text-gray-600">
                Always check response status codes and handle errors gracefully. The API returns
                standard HTTP status codes with detailed error messages in the response body.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Pagination</h3>
              <p className="text-gray-600">
                Use the <code className="bg-gray-100 px-2 py-1 rounded">page</code> and{' '}
                <code className="bg-gray-100 px-2 py-1 rounded">limit</code> parameters to paginate
                through large result sets. Check the{' '}
                <code className="bg-gray-100 px-2 py-1 rounded">meta</code> object for total counts
                and page information.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Rate Limit Management</h3>
              <p className="text-gray-600">
                Monitor the rate limit headers in responses. If you receive a 429 status code, wait
                until the reset time before making more requests. Consider implementing exponential
                backoff for retries.
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Caching</h3>
              <p className="text-gray-600">
                Cache responses when appropriate to reduce API calls. Leaderboard data updates
                periodically, so caching for 5-10 minutes is recommended. Always respect
                cache-control headers.
              </p>
            </div>
          </div>
        </section>

        {/* Support */}
        <section className="mb-16">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">Need Help?</h2>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
            <p className="text-gray-700 mb-4">
              Have questions or need assistance with the API? We&apos;re here to help!
            </p>
            <ul className="space-y-2 text-gray-700">
              <li>
                📧 Email:{' '}
                <a
                  href="mailto:api@tournament-platform.com"
                  className="text-blue-600 hover:underline"
                >
                  api@tournament-platform.com
                </a>
              </li>
              <li>
                📚 Documentation:{' '}
                <a href="/api-docs" className="text-blue-600 hover:underline">
                  Interactive API Reference
                </a>
              </li>
              <li>
                🔑 Developer Portal:{' '}
                <a href="/developer" className="text-blue-600 hover:underline">
                  Manage API Keys
                </a>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
