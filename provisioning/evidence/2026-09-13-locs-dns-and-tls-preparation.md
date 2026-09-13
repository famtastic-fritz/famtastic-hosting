# DNS and TLS preparation, September 13

After cPanel domain creation and exact vhost-IP verification, changed only the
existing registrar apex A record from Parked to 107.180.51.234 (TTL600).
Registrar success notice and saved record verified. All other six records,
including nameservers, www CNAME and default DMARC, remain unchanged.
At 07:08 UTC ns43 returned the new IP while ns44 still returned parking IPs.
Propagation is not complete; do not repeatedly overwrite the same DNS record.

Existing SSH access works as the intended cPanel account. Its primary machine
IP is 107.180.116.83, DIFFERENT from the customer vhost IP107.180.51.234.
Use cPanel DomainInfo's exact virtual-host IP, not hostname -i, for public DNS.
The new document root exists and contains only the default cgi-bin directory;
an explicit Host request reaches Apache403, not a deployed customer website.

Existing /home/nineoo/.acme.sh/acme.sh is version3.1.4. Daily ACME cron exists
at server schedule59 16 * * *. This does not prove Locs renewal: no Locs
certificate existed in --list. Do not run account-wide renewal or change
neighbor certificates. The UAPI AutoSSL status and Cron lookup were rejected;
SSH supplied the actual client/schedule evidence. No certificate issued yet.

Next: once both nameservers propagate, issue only apex+www via exact new
webroot using existing Let's Encrypt account; install via scoped cPanel
deploy hook with correct account credentials; test chain/hostname and renewal
configuration without forcing unrelated renewals. No new SSL purchase.
