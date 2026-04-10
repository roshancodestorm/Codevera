const key = "kYN9mdLGsnsKfjSkH1Ptd6xwEQMACsxLOqotrnWtDpTvYcPUw5fiO3K1B0YO";

const test = async () => {
  try {
    console.log("Fetching models from x.ai...");
    const response = await fetch('https://api.x.ai/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key}`,
      }
    });

    const data = await response.json();
    console.log("RESPONSE:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("ERROR:", err.message);
  }
};

test();
