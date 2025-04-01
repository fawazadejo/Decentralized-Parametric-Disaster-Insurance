;; Policy Issuance Contract
;; This contract defines coverage terms and conditions

;; Define data variables
(define-data-var admin principal tx-sender)

;; Simple map for policies
(define-map policies
  { id: (string-utf8 36) }
  {
    holder: principal,
    region: (string-utf8 36),
    coverage-amount: uint,
    premium: uint,
    disaster-type: (string-utf8 36),
    active: bool,
    start-date: uint,
    end-date: uint
  }
)

;; Simple map for available regions
(define-map regions
  { id: (string-utf8 36) }
  { active: bool }
)

;; Simple map for disaster types
(define-map disaster-types
  { id: (string-utf8 36) }
  { active: bool }
)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u100))
(define-constant ERR-ALREADY-EXISTS (err u101))
(define-constant ERR-NOT-FOUND (err u102))
(define-constant ERR-INVALID-PARAMS (err u103))
(define-constant ERR-INACTIVE (err u104))

;; Read-only functions
(define-read-only (get-admin)
  (var-get admin)
)

(define-read-only (get-policy (id (string-utf8 36)))
  (map-get? policies { id: id })
)

(define-read-only (is-policy-active (id (string-utf8 36)))
  (default-to false (get active (map-get? policies { id: id })))
)

(define-read-only (is-region-active (id (string-utf8 36)))
  (default-to false (get active (map-get? regions { id: id })))
)

(define-read-only (is-disaster-type-active (id (string-utf8 36)))
  (default-to false (get active (map-get? disaster-types { id: id })))
)

;; Public functions
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-NOT-AUTHORIZED)
    (ok (var-set admin new-admin))
  )
)

(define-public (add-region (id (string-utf8 36)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-NOT-AUTHORIZED)
    (ok (map-set regions { id: id } { active: true }))
  )
)

(define-public (add-disaster-type (id (string-utf8 36)))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-NOT-AUTHORIZED)
    (ok (map-set disaster-types { id: id } { active: true }))
  )
)

(define-public (issue-policy
  (id (string-utf8 36))
  (region (string-utf8 36))
  (coverage-amount uint)
  (premium uint)
  (disaster-type (string-utf8 36))
  (start-date uint)
  (end-date uint))
  (begin
    (asserts! (is-region-active region) ERR-INACTIVE)
    (asserts! (is-disaster-type-active disaster-type) ERR-INACTIVE)
    (asserts! (> end-date start-date) ERR-INVALID-PARAMS)
    (asserts! (> coverage-amount u0) ERR-INVALID-PARAMS)
    (asserts! (> premium u0) ERR-INVALID-PARAMS)
    (asserts! (is-none (map-get? policies { id: id })) ERR-ALREADY-EXISTS)

    (ok (map-set policies
      { id: id }
      {
        holder: tx-sender,
        region: region,
        coverage-amount: coverage-amount,
        premium: premium,
        disaster-type: disaster-type,
        active: true,
        start-date: start-date,
        end-date: end-date
      }
    ))
  )
)

(define-public (cancel-policy (id (string-utf8 36)))
  (let ((policy (map-get? policies { id: id })))
    (asserts! (is-some policy) ERR-NOT-FOUND)
    (asserts! (is-eq tx-sender (get holder (unwrap-panic policy))) ERR-NOT-AUTHORIZED)

    (ok (map-set policies
      { id: id }
      {
        holder: (get holder (unwrap-panic policy)),
        region: (get region (unwrap-panic policy)),
        coverage-amount: (get coverage-amount (unwrap-panic policy)),
        premium: (get premium (unwrap-panic policy)),
        disaster-type: (get disaster-type (unwrap-panic policy)),
        active: false,
        start-date: (get start-date (unwrap-panic policy)),
        end-date: (get end-date (unwrap-panic policy))
      }
    ))
  )
)
