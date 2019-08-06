const { expect } = require('chai');
const ApiEndpointData = require('../../../lib/data/api-endpoint-data.js'); // TODO: Sort out these requires

describe('ApiEndpointData', () => {
  describe('#findAuthorisationHeadersForUsername()', () => {
    beforeEach(() => {
      const webAppConfig = {
        users: [
          {username: 'Public', password: null},
          {username: 'evanrolfe@onescan.io', password: 'Password1'},
          {username: 'evanrolfe@gmail.com', password: 'Password2'}
        ],
        authorisationHeaders: ['authorization'],
        responseIsAuthorised: (response, body) => { return true; }
      }
      this.apiEndpointData = new ApiEndpointData({webAppConfig: webAppConfig});
      this.apiEndpointData.loadFile('./test/unit/fixtures/api_endpoints.json');
    });

    it('should return apiRequests for Public', () => {
      const headers = this.apiEndpointData.findAuthorisationHeadersForUsername('Public');
      expect(headers).to.eql({});
    });

    it('should return apiRequests for evanrolfe@gmail.com', () => {
      const headers = this.apiEndpointData.findAuthorisationHeadersForUsername('evanrolfe@gmail.com');
      expect(headers['authorization']).to.equal('EVANROLFE_GMAIL_AUTHTOKEN');
    });

    it('should return apiRequests for evanrolfe@onescan.io', () => {
      const headers = this.apiEndpointData.findAuthorisationHeadersForUsername('evanrolfe@onescan.io');
      expect(headers['authorization']).to.equal('EVANROLFE_ONESCAN_AUTHTOKEN');
    });
  });

  describe('#findIntrusionRequestsForUsername()', () => {
    beforeEach(() => {
      const webAppConfig = {
        users: [
          {username: 'Public', password: null},
          {username: 'evanrolfe@onescan.io', password: 'Password1'},
          {username: 'evanrolfe@gmail.com', password: 'Password2'}
        ],
        authorisationHeaders: ['authorization'],
        responseIsAuthorised: (response, body) => { return true; }
      }
      this.apiEndpointData = new ApiEndpointData({webAppConfig: webAppConfig});
      this.apiEndpointData.loadFile('./test/unit/fixtures/api_endpoints.json');
    });

    it('should return intrusionRequests for Public', () => {
      const intruderHeaders = {};
      const intrusionRequests = this.apiEndpointData.findIntrusionRequestsForUsername('Public', intruderHeaders);
      const urls = intrusionRequests.map(intrusionRequest => intrusionRequest.url);

      intrusionRequests.forEach((intrusionRequest) => {
        expect(intrusionRequest.headers.authorization).to.equal(undefined);
      });
      expect(urls).to.eql([
        'http://localhost:3001/secrets/1.json',
        'http://localhost:3001/secrets/4.json',
        'http://localhost:3001/secrets/116.json',
        'http://localhost:3001/secrets/117.json',
        'http://localhost:3001/secrets/118.json'
      ]);
    });

    it('should return intrusionRequests for evanrolfe@onescan.io', () => {
      const intruderHeaders = {'authorization': 'EVANROLFE_ONESCAN_AUTHTOKEN'};
      const intrusionRequests = this.apiEndpointData.findIntrusionRequestsForUsername('evanrolfe@onescan.io', intruderHeaders);
      const urls = intrusionRequests.map(intrusionRequest => intrusionRequest.url);

      intrusionRequests.forEach((intrusionRequest) => {
        expect(intrusionRequest.headers.authorization).to.equal('EVANROLFE_ONESCAN_AUTHTOKEN');
      });
      expect(urls).to.eql([
        'http://localhost:3001/secrets/117.json',
        'http://localhost:3001/secrets/118.json'
      ]);
    });

    it('should return intrusionRequests for evanrolfe@gmail.com', () => {
      const intruderHeaders = {'authorization': 'EVANROLFE_GMAIL_AUTHTOKEN'};
      const intrusionRequests = this.apiEndpointData.findIntrusionRequestsForUsername('evanrolfe@gmail.com', intruderHeaders);
      expect(intrusionRequests.length).to.equal(3);

      const urls = intrusionRequests.map(intrusionRequest => intrusionRequest.url);

      intrusionRequests.forEach((intrusionRequest) => {
        expect(intrusionRequest.headers.authorization).to.equal('EVANROLFE_GMAIL_AUTHTOKEN');
      });
      expect(urls).to.eql([
        'http://localhost:3001/secrets/1.json',
        'http://localhost:3001/secrets/4.json',
        'http://localhost:3001/secrets/116.json'
      ]);
    });
  });

  describe('#apiResponseCallback()', () => {
    beforeEach(() => {
      const webAppConfig = {
        users: [
          {username: 'Public', password: null},
          {username: 'evanrolfe@onescan.io', password: 'Password1'},
          {username: 'evanrolfe@gmail.com', password: 'Password2'}
        ],
        authorisationHeaders: ['authorization'],
        responseIsAuthorised: (response, body) => { return true; }
      }
      this.apiEndpointData = new ApiEndpointData({webAppConfig: webAppConfig});

      this.mockResponse = {
        url() { return 'http://localhost:3001/secrets/1.json' },
        status() { return 200 },
        headers() { return { 'x-request-id': '74ef04c4-b5cf-413d-8bad-571d90ddbab2' } },
        text() { return '{}' },
        request() {
          return {
            headers() { return { 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64)' } },
            method() { return 'GET' }
          }
        },
      };
    });

    // TODO: Test when the cookies arg is not null
    context('when there is no api-endpoint for the request', () => {
      it('should save the api-request to a new api-endpoint entry', async () => {
        await this.apiEndpointData.apiResponseCallback(this.mockResponse, null, 'http://localhost:3000/secrets/1', 'Public');

        const result = this.apiEndpointData.apiEndpoints[0];

        expect(result.url).to.equal('http://localhost:3001/secrets/1.json');
        expect(result.method).to.equal('GET');
        expect(result.requests.length).to.equal(1);

        expect(result.requests[0].user).to.equal('Public');
        expect(result.requests[0].pageUrl).to.equal('http://localhost:3000/secrets/1');
        expect(result.requests[0].headers).to.eql({ 'user-agent': 'Mozilla/5.0 (X11; Linux x86_64)' });
        expect(result.requests[0].response.status).to.equal(200);
        expect(result.requests[0].response.headers).to.eql({ 'x-request-id': '74ef04c4-b5cf-413d-8bad-571d90ddbab2' });
        expect(result.requests[0].response.authorised).to.equal(true);
      });
    });

    context('when there is already an api-endpoint for the request and another requeuest entry for this user logged', () => {
      it('should save the api-request to that api-endpoint', async () => {
        await this.apiEndpointData.apiResponseCallback(this.mockResponse, null, 'http://localhost:3000/secrets/1', 'Public');
        await this.apiEndpointData.apiResponseCallback(this.mockResponse, null, 'http://localhost:3000/secrets/1/edit', 'Public');

        const result = this.apiEndpointData.apiEndpoints[0];

        expect(result.url).to.equal('http://localhost:3001/secrets/1.json');
        expect(result.method).to.equal('GET');
        expect(result.requests.length).to.equal(2);

        expect(result.requests[0].user).to.equal('Public');
        expect(result.requests[0].pageUrl).to.equal('http://localhost:3000/secrets/1');
        expect(result.requests[1].user).to.equal('Public');
        expect(result.requests[1].pageUrl).to.equal('http://localhost:3000/secrets/1/edit');
      });
    });
  });
});
