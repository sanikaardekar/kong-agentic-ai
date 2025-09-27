// Test the email finder service
const testEmailFinder = async () => {
  const companies = ['Google', 'Microsoft', 'Netflix', 'Airbnb'];
  
  for (const company of companies) {
    try {
      console.log(`\n=== Finding emails for ${company} ===`);
      
      // Test via Kong gateway
      const response = await fetch('http://localhost:8000/emails', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': 'hackathon-2024-key'
        },
        body: JSON.stringify({ company })
      });
      
      const data = await response.json();
      console.log(`Found ${data.totalEmails} emails:`);
      
      data.emails.forEach((email, index) => {
        console.log(`${index + 1}. ${email.email} (${email.confidence} confidence, source: ${email.source})`);
      });
      
    } catch (error) {
      console.error(`Error finding emails for ${company}:`, error.message);
    }
  }
};

// Test direct service (without Kong)
const testDirect = async () => {
  console.log('\n=== Testing direct service ===');
  try {
    const response = await fetch('http://localhost:5000/emails/Tesla', {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    
    const data = await response.json();
    console.log('Direct service response:', data);
  } catch (error) {
    console.error('Direct test failed:', error.message);
  }
};

// Run tests
testEmailFinder().then(() => testDirect());