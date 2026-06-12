const axios = require('axios');

async function axiosRequest(method, url, headers = {}, data = null) {
  const config = {
    method: method,
    url: url,
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    data: data ? data : undefined
  };

  try {
    const response = await axios(config);
    return {
      status: 'success',
      data: response.data
    };
  } catch (error) {
    console.error('axiosRequest error:', error?.response?.data || error.message);
    return {
      status: 'failed',
      data: 'Something happened wrong. Please try again',
      error: error
    };
  }
}

function makeRequest(method, url, headers, body) {
  return new Promise((resolve, reject) => {
    console.log(method, url, headers, body, "check this request");

    const config = {
      method: method,
      url: url,
      headers: headers
    };

    if (body) {
      config.data = body;
    }

    axios(config)
      .then(function (response) {
        resolve({ status: 'success', data: response.data });
        console.log('success', response.data);
      })
      .catch(function (error) {
        console.log('Error at makeRequest:', error.message);
        console.log({ status: 'failed', data: error?.response?.data });
        resolve({ status: 'failed', data: error.response?.data || error.message });
      });
  });
}

module.exports = { axiosRequest, makeRequest };
