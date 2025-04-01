import { describe, it, expect, beforeEach, vi } from "vitest"

// Mock the Clarity contract calls
const mockContractCall = vi.fn()

// Mock the tx-sender
let mockTxSender = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const mockAdmin = "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM"
const mockOracle1 = "ST2CY5V39NHDPWSXMW9QDT3HC3GD6Q6XX4CFRK9AG"
const mockOracle2 = "ST3NBRSFKX28FQ2ZJ1MAKX58HKHSDGNV5N7R21XCP"

// Mock current time
const mockCurrentTime = 1617235200 // Example timestamp

// Mock oracles
const mockOracles = {
  "oracle-1": {
    address: mockOracle1,
    active: true,
  },
  "oracle-2": {
    address: mockOracle2,
    active: true,
  },
  "inactive-oracle": {
    address: mockOracle2,
    active: false,
  },
}

// Mock disaster events
const mockDisasterEvents = {
  "event-123": {
    region: "florida",
    disasterType: "hurricane",
    severity: 4,
    timestamp: mockCurrentTime - 1000,
    verified: true,
  },
  "event-456": {
    region: "california",
    disasterType: "earthquake",
    severity: 6,
    timestamp: mockCurrentTime - 2000,
    verified: false,
  },
}

// Mock contract functions
const eventDetection = {
  getAdmin: () => mockAdmin,
  getDisasterEvent: (id: string) => {
    return mockDisasterEvents[id] || null
  },
  isEventVerified: (id: string) => {
    const event = mockDisasterEvents[id]
    return event ? event.verified : false
  },
  isOracle: (id: string) => {
    const oracle = mockOracles[id]
    return oracle ? oracle.active : false
  },
  registerOracle: (id: string, address: string) => {
    mockContractCall("registerOracle", id, address)
    
    if (mockTxSender !== mockAdmin) {
      return { error: 200 } // ERR-NOT-AUTHORIZED
    }
    
    if (id in mockOracles) {
      return { error: 201 } // ERR-ALREADY-EXISTS
    }
    
    return { value: true }
  },
  deactivateOracle: (id: string) => {
    mockContractCall("deactivateOracle", id)
    
    if (mockTxSender !== mockAdmin) {
      return { error: 200 } // ERR-NOT-AUTHORIZED
    }
    
    if (!(id in mockOracles)) {
      return { error: 202 } // ERR-NOT-FOUND
    }
    
    return { value: true }
  },
  reportDisasterEvent: (id: string, region: string, disasterType: string, severity: number, oracleId: string) => {
    mockContractCall("reportDisasterEvent", id, region, disasterType, severity, oracleId)
    
    if (!(oracleId in mockOracles)) {
      return { error: 202 } // ERR-NOT-FOUND
    }
    
    if (!mockOracles[oracleId].active) {
      return { error: 200 } // ERR-NOT-AUTHORIZED
    }
    
    if (mockTxSender !== mockOracles[oracleId].address) {
      return { error: 200 } // ERR-NOT-AUTHORIZED
    }
    
    if (id in mockDisasterEvents) {
      return { error: 201 } // ERR-ALREADY-EXISTS
    }
    
    if (severity <= 0) {
      return { error: 203 } // ERR-INVALID-PARAMS
    }
    
    return { value: true }
  },
}

describe("Event Detection Contract", () => {
  beforeEach(() => {
    mockContractCall.mockClear()
    mockTxSender = mockAdmin // Reset tx-sender to admin for each test
  })
  
  describe("registerOracle", () => {
    it("should register a new oracle successfully", () => {
      const result = eventDetection.registerOracle("new-oracle", mockOracle2)
      expect(result).toEqual({ value: true })
      expect(mockContractCall).toHaveBeenCalledWith("registerOracle", "new-oracle", mockOracle2)
    })
    
    it("should fail if caller is not admin", () => {
      mockTxSender = mockOracle1 // Not the admin
      const result = eventDetection.registerOracle("new-oracle", mockOracle2)
      expect(result).toEqual({ error: 200 }) // ERR-NOT-AUTHORIZED
    })
    
    it("should fail if oracle already exists", () => {
      const result = eventDetection.registerOracle("oracle-1", mockOracle1)
      expect(result).toEqual({ error: 201 }) // ERR-ALREADY-EXISTS
    })
  })
  
  describe("deactivateOracle", () => {
    it("should deactivate an oracle successfully", () => {
      const result = eventDetection.deactivateOracle("oracle-1")
      expect(result).toEqual({ value: true })
      expect(mockContractCall).toHaveBeenCalledWith("deactivateOracle", "oracle-1")
    })
    
    it("should fail if caller is not admin", () => {
      mockTxSender = mockOracle1 // Not the admin
      const result = eventDetection.deactivateOracle("oracle-1")
      expect(result).toEqual({ error: 200 }) // ERR-NOT-AUTHORIZED
    })
    
    it("should fail if oracle does not exist", () => {
      const result = eventDetection.deactivateOracle("non-existent-oracle")
      expect(result).toEqual({ error: 202 }) // ERR-NOT-FOUND
    })
  })
  
  describe("reportDisasterEvent", () => {
    it("should report a disaster event successfully", () => {
      mockTxSender = mockOracle1
      const result = eventDetection.reportDisasterEvent("new-event", "texas", "flood", 3, "oracle-1")
      expect(result).toEqual({ value: true })
      expect(mockContractCall).toHaveBeenCalledWith("reportDisasterEvent", "new-event", "texas", "flood", 3, "oracle-1")
    })
    
    it("should fail if oracle does not exist", () => {
      mockTxSender = mockOracle1
      const result = eventDetection.reportDisasterEvent("new-event", "texas", "flood", 3, "non-existent-oracle")
      expect(result).toEqual({ error: 202 }) // ERR-NOT-FOUND
    })
    
    it("should fail if oracle is inactive", () => {
      mockTxSender = mockOracle2
      const result = eventDetection.reportDisasterEvent("new-event", "texas", "flood", 3, "inactive-oracle")
      expect(result).toEqual({ error: 200 }) // ERR-NOT-AUTHORIZED
    })
    
    it("should fail if caller is not the oracle", () => {
      mockTxSender = mockOracle2 // Not oracle-1
      const result = eventDetection.reportDisasterEvent("new-event", "texas", "flood", 3, "oracle-1")
      expect(result).toEqual({ error: 200 }) // ERR-NOT-AUTHORIZED
    })
    
    it("should fail if event already exists", () => {
      mockTxSender = mockOracle1
      const result = eventDetection.reportDisasterEvent("event-123", "florida", "hurricane", 4, "oracle-1")
      expect(result).toEqual({ error: 201 }) // ERR-ALREADY-EXISTS
    })
    
    it("should fail if severity is not positive", () => {
      mockTxSender = mockOracle1
      const result = eventDetection.reportDisasterEvent(
          "new-event",
          "texas",
          "flood",
          0, // Zero severity
          "oracle-1",
      )
      expect(result).toEqual({ error: 203 }) // ERR-INVALID-PARAMS
    })
  })
  
  describe("isEventVerified", () => {
    it("should return true for verified events", () => {
      const result = eventDetection.isEventVerified("event-123")
      expect(result).toBe(true)
    })
    
    it("should return false for unverified events", () => {
      const result = eventDetection.isEventVerified("event-456")
      expect(result).toBe(false)
    })
    
    it("should return false for non-existent events", () => {
      const result = eventDetection.isEventVerified("non-existent-event")
      expect(result).toBe(false)
    })
  })
})

