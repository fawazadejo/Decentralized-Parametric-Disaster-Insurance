;; Event Detection Contract
;; This contract monitors for triggering natural disasters

;; Define data variables
(define-data-var admin principal tx-sender)

;; Simple map for disaster events
(define-map disaster-events
  { id: (string-utf8 36) }
  {
    region: (string-utf8 36),
    disaster-type: (string-utf8 36),
    severity: uint,
    timestamp: uint,
    verified: bool
  }
)

;; Simple map for oracles
(define-map oracles
  { id: (string-utf8 36) }
  {
    address: principal,
    active: bool
  }
)

;; Error codes
(define-constant ERR-NOT-AUTHORIZED (err u200))
(define-constant ERR-ALREADY-EXISTS (err u201))
(define-constant ERR-NOT-FOUND (err u202))
(define-constant ERR-INVALID-PARAMS (err u203))

;; Read-only functions
(define-read-only (get-admin)
  (var-get admin)
)

(define-read-only (get-disaster-event (id (string-utf8 36)))
  (map-get? disaster-events { id: id })
)

(define-read-only (is-event-verified (id (string-utf8 36)))
  (default-to false (get verified (map-get? disaster-events { id: id })))
)

(define-read-only (is-oracle (id (string-utf8 36)))
  (let ((oracle (map-get? oracles { id: id })))
    (and (is-some oracle) (get active (unwrap-panic oracle)))
  )
)

;; Public functions
(define-public (set-admin (new-admin principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-NOT-AUTHORIZED)
    (ok (var-set admin new-admin))
  )
)

(define-public (register-oracle (id (string-utf8 36)) (address principal))
  (begin
    (asserts! (is-eq tx-sender (var-get admin)) ERR-NOT-AUTHORIZED)
    (asserts! (is-none (map-get? oracles { id: id })) ERR-ALREADY-EXISTS)

    (ok (map-set oracles
      { id: id }
      {
        address: address,
        active: true
      }
    ))
  )
)

(define-public (deactivate-oracle (id (string-utf8 36)))
  (let ((oracle (map-get? oracles { id: id })))
    (asserts! (is-eq tx-sender (var-get admin)) ERR-NOT-AUTHORIZED)
    (asserts! (is-some oracle) ERR-NOT-FOUND)

    (ok (map-set oracles
      { id: id }
      {
        address: (get address (unwrap-panic oracle)),
        active: false
      }
    ))
  )
)

(define-public (report-disaster-event
  (id (string-utf8 36))
  (region (string-utf8 36))
  (disaster-type (string-utf8 36))
  (severity uint)
  (oracle-id (string-utf8 36)))
  (let ((oracle (map-get? oracles { id: oracle-id })))
    (asserts! (is-some oracle) ERR-NOT-FOUND)
    (asserts! (get active (unwrap-panic oracle)) ERR-NOT-AUTHORIZED)
    (asserts! (is-eq tx-sender (get address (unwrap-panic oracle))) ERR-NOT-AUTHORIZED)
    (asserts! (is-none (map-get? disaster-events { id: id })) ERR-ALREADY-EXISTS)
    (asserts! (> severity u0) ERR-INVALID-PARAMS)

    (ok (map-set disaster-events
      { id: id }
      {
        region: region,
        disaster-type: disaster-type,
        severity: severity,
        timestamp: (default-to u0 (get-block-info? time (- block-height u1))),
        verified: true
      }
    ))
  )
)
