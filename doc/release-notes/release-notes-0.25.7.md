# Bitcoin ABC 0.25.7 Release Notes

Bitcoin ABC version 0.25.7 is now available from:

  <https://download.bitcoinabc.org/0.25.7/>

This release includes the following features and fixes:
- Redefine the BIP71 MIME types for ausCash payment request messages to:

    | Message        | Type/Subtype                     |
    |----------------|----------------------------------|
    | PaymentRequest | application/auscash-paymentrequest |
    | Payment        | application/auscash-payment        |
    | PaymentACK     | application/auscash-paymentack     |
