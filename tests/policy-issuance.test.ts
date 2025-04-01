import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the Clarity contract calls
const mockContractCall = vi.fn();

// Mock the tx-sender
let mockTxSender = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const mockAdmin = 'ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM';
const mockPolicyHolder = 'ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP';

// Mock current block time
const mockCurrentTime = 1617235200; // Example timestamp

// Mock regions and disaster types
const mockRegions = {
  'california': true,
  'florida': true,
  'texas': true,
  'inactive-region': false
};

const mockDisasterTypes = {
  'earthquake': true,
  'hurricane': true,
  'flood': true,
  'inactive-type': false
};

// Mock policies
const mockPolicies = {
  'policy-1': {
    holder: mockPolicyHolder,
    region: 'california',
    coverageAmount: 1000000,
    premium: 10000,
    disasterType: 'earthquake',
    active: true,
    startDate: mockCurrentTime - 10000,
    endDate: mockCurrentTime + 100000
  },
  'policy-2': {
    holder: mockPolicyHolder,
    region: 'florida',
    coverageAmount: 500000,
    premium: 5000,
    disasterType: 'hurricane',
    active: false,
    startDate: mockCurrentTime - 20000,
    endDate: mockCurrentTime + 80000
  }
};

// Mock contract functions
const policyIssuance = {
  getAdmin: () => mockAdmin,
  getPolicy: (id: string) => {
    return mockPolicies[id] || null;
  },
  isPolicyActive: (id: string) => {
    return mockPolicies[id] ? mockPolicies[id].active : false;
  },
  isRegionActive: (id: string) => {
    return mockRegions[id] || false;
  },
  isDisasterTypeActive: (id: string) => {
    return mockDisasterTypes[id] || false;
  },
  addRegion: (id: string) => {
    mockContractCall('addRegion', id);
    
    if (mockTxSender !== mockAdmin) {
      return { error: 100 }; // ERR-NOT-AUTHORIZED
    }
    
    return { value: true };
  },
  addDisasterType: (id: string) => {
    mockContractCall('addDisasterType', id);
    
    if (mockTxSender !== mockAdmin) {
      return { error: 100 }; // ERR-NOT-AUTHORIZED
    }
    
    return { value: true };
  },
  issuePolicy: (id: string, region: string, coverageAmount: number, premium: number, disasterType: string, startDate: number, endDate: number) => {
    mockContractCall('issuePolicy', id, region, coverageAmount, premium, disasterType, startDate, endDate);
    
    if (!mockRegions[region]) {
      return { error: 104 }; // ERR-INACTIVE
    }
    
    if (!mockDisasterTypes[disasterType]) {
      return { error: 104 }; // ERR-INACTIVE
    }
    
    if (endDate <= startDate) {
      return { error: 103 }; // ERR-INVALID-PARAMS
    }
    
    if (coverageAmount <= 0 || premium <= 0) {
      return { error: 103 }; // ERR-INVALID-PARAMS
    }
    
    if (id in mockPolicies) {
      return { error: 101 }; // ERR-ALREADY-EXISTS
    }
    
    return { value: true };
  },
  cancelPolicy: (id: string) => {
    mockContractCall('cancelPolicy', id);
    
    if (!(id in mockPolicies)) {
      return { error: 102 }; // ERR-NOT-FOUND
    }
    
    if (mockTxSender !== mockPolicies[id].holder) {
      return { error: 100 }; // ERR-NOT-AUTHORIZED
    }
    
    return { value: true };
  }
};

describe('Policy Issuance Contract', () => {
  beforeEach(() => {
    mockContractCall.mockClear();
    mockTxSender = mockAdmin; // Reset tx-sender to admin for each test
  });
  
  describe('addRegion', () => {
    it('should add a region successfully', () => {
      const result = policyIssuance.addRegion('new-region');
      expect(result).toEqual({ value: true });
      expect(mockContractCall).toHaveBeenCalledWith('addRegion', 'new-region');
    });
    
    it('should fail if caller is not admin', () => {
      mockTxSender = mockPolicyHolder; // Not the admin
      const result = policyIssuance.addRegion('new-region');
      expect(result).toEqual({ error: 100 }); // ERR-NOT-AUTHORIZED
    });
  });
  
  describe('addDisasterType', () => {
    it('should add a disaster type successfully', () => {
      const result = policyIssuance.addDisasterType('wildfire');
      expect(result).toEqual({ value: true });
      expect(mockContractCall).toHaveBeenCalledWith('addDisasterType', 'wildfire');
    });
    
    it('should fail if caller is not admin', () => {
      mockTxSender = mockPolicyHolder; // Not the admin
      const result = policyIssuance.addDisasterType('wildfire');
      expect(result).toEqual({ error: 100 }); // ERR-NOT-AUTHORIZED
    });
  });
  
  describe('issuePolicy', () => {
    it('should issue a policy successfully', () => {
      mockTxSender = mockPolicyHolder;
      const result = policyIssuance.issuePolicy(
          'new-policy',
          'california',
          1000000,
          10000,
          'earthquake',
          mockCurrentTime,
          mockCurrentTime + 100000
      );
      expect(result).toEqual({ value: true });
      expect(mockContractCall).toHaveBeenCalledWith(
          'issuePolicy',
          'new-policy',
          'california',
          1000000,
          10000,
          'earthquake',
          mockCurrentTime,
          mockCurrentTime + 100000
      );
    });
    
    it('should fail if region is inactive', () => {
      mockTxSender = mockPolicyHolder;
      const result = policyIssuance.issuePolicy(
          'new-policy',
          'inactive-region',
          1000000,
          10000,
          'earthquake',
          mockCurrentTime,
          mockCurrentTime + 100000
      );
      expect(result).toEqual({ error: 104 }); // ERR-INACTIVE
    });
    
    it('should fail if disaster type is inactive', () => {
      mockTxSender = mockPolicyHolder;
      const result = policyIssuance.issuePolicy(
          'new-policy',
          'california',
          1000000,
          10000,
          'inactive-type',
          mockCurrentTime,
          mockCurrentTime + 100000
      );
      expect(result).toEqual({ error: 104 }); // ERR-INACTIVE
    });
    
    it('should fail if end date is not after start date', () => {
      mockTxSender = mockPolicyHolder;
      const result = policyIssuance.issuePolicy(
          'new-policy',
          'california',
          1000000,
          10000,
          'earthquake',
          mockCurrentTime,
          mockCurrentTime
      );
      expect(result).toEqual({ error: 103 }); // ERR-INVALID-PARAMS
    });
    
    it('should fail if coverage amount is not positive', () => {
      mockTxSender = mockPolicyHolder;
      const result = policyIssuance.issuePolicy(
          'new-policy',
          'california',
          0,
          10000,
          'earthquake',
          mockCurrentTime,
          mockCurrentTime + 100000
      );
      expect(result).toEqual({ error: 103 }); // ERR-INVALID-PARAMS
    });
    
    it('should fail if premium is not positive', () => {
      mockTxSender = mockPolicyHolder;
      const result = policyIssuance.issuePolicy(
          'new-policy',
          'california',
          1000000,
          0,
          'earthquake',
          mockCurrentTime,
          mockCurrentTime + 100000
      );
      expect(result).toEqual({ error: 103 }); // ERR-INVALID-PARAMS
    });
    
    it('should fail if policy already exists', () => {
      mockTxSender = mockPolicyHolder;
      const result = policyIssuance.issuePolicy(
          'policy-1',
          'california',
          1000000,
          10000,
          'earthquake',
          mockCurrentTime,
          mockCurrentTime + 100000
      );
      expect(result).toEqual({ error: 101 }); // ERR-ALREADY-EXISTS
    });
  });
  
  describe('cancelPolicy', () => {
    it('should cancel a policy successfully', () => {
      mockTxSender = mockPolicyHolder;
      const result = policyIssuance.cancelPolicy('policy-1');
      expect(result).toEqual({ value: true });
      expect(mockContractCall).toHaveBeenCalledWith('cancelPolicy', 'policy-1');
    });
    
    it('should fail if policy does not exist', () => {
      mockTxSender = mockPolicyHolder;
      const result = policyIssuance.cancelPolicy('non-existent-policy');
      expect(result).toEqual({ error: 102 }); // ERR-NOT-FOUND
    });
    
    it('should fail if caller is not the policy holder', () => {
      mockTxSender = mockAdmin; // Not the policy holder
      const result = policyIssuance.cancelPolicy('policy-1');
      expect(result).toEqual({ error: 100 }); // ERR-NOT-AUTHORIZED
    });
  });
});
