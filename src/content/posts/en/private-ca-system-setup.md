---
title: Setting Up a Private CA System
date: 2021-07-27
tags: [SSL/TLS, CA, digital certificates, OpenSSL]
---

## 0x00 Preface

I've recently found that I need self-signed certificates in lots of places: from all kinds of SSL-based services on the LAN, to OpenVPN's virtual Ethernet bridge, down to capturing HTTPS traffic. If every place uses its own new self-signed certificate (usually a CA certificate, too), lots of problems come up, for example:

- The certificates are scattered and unsystematic, which makes them hard to manage;
- All the certificates are CA certificates, so a leak means endless trouble;
- Some places need a certificate chain of trust rather than separate, scattered CA certificates. For example, OpenVPN's virtual Ethernet bridge needs the server and the clients to use different certificates, but those certificates have to be under the same root CA.

This post looks at how to set up a complete CA system, including certificate revocation.

## 0x01 Before We Start

This post assumes some background knowledge. The reader should:

1. Know the concept of digital signatures and how they basically work;
1. Understand digital certificates and their basic structure;
1. Know the basics of using OpenSSL.

## 0x02 Getting Started

### Creating the Root CA

#### Setting Up the Working Directory

Create the working environment with this directory tree[^eolWindows]:

```plain
.                 // Working directory of this CA
│  crlnumber      // Current CRL number, must start at "01"
│  index.txt      // Index file
│  root.cnf       // OpenSSL configuration file
│  serial         // Current certificate serial number, must start at "01"
│
├─cacert          // Where the CA certificate goes
│  │
│  └─private      // Where the CA private key goes
│
├─certs           // Where certificates issued by the CA go
├─crl             // Where CRLs issued by the CA go
└─newcerts        // Where new certificates go
```

[^eolWindows]:
    For Windows users, **all text files must have `LF` line endings**, not the Windows default `CR/LF`.\
    `index.txt` in particular must use `LF`, or revoking certificates will fail.\
    You can convert line endings to `LF` with tools like `dos2unix`, or with any capable text editor.

#### Writing the OpenSSL Configuration File

[Reference documentation](https://www.openssl.org/docs/manmaster/man5/x509v3_config.html)

1. Get OpenSSL's template configuration file from [here](https://github.com/openssl/openssl/blob/master/apps/openssl.cnf)[^codeOpenSSLConfigTemplate], and copy and save it as `root.cnf`;
1. If, after configuring, you get an error like the one below, comment out the `openssl_conf` entry:
   ```plain
   Error configuring OpenSSL modules
   19568:error:25078067:DSO support routines:win32_load:could not load the shared library:crypto\dso\dso_win32.c:108:filename(providers.dll)
   19568:error:25070067:DSO support routines:DSO_load:could not load the shared library:crypto\dso\dso_lib.c:162:
   19568:error:0E07506E:configuration file routines:module_load_dso:error loading dso:crypto\conf\conf_mod.c:224:module=providers, path=providers
   19568:error:0E076071:configuration file routines:module_run:unknown module name:crypto\conf\conf_mod.c:165:module=providers
   ```
1. Uncomment the `extensions` entry and set its value to `v3_req`. This makes the `x509` module generate an `X.509 V3` certificate for this CA, using the information in `v3_req`.
1. Edit the `[ ca ]` section: change the value of `default_ca` to `ca_root`;
1. Rename the `[ CA_default ]` section to `[ ca_root ]`;
1. Edit the `[ ca_root ]` section:
   1. `dir` is the directory that holds everything for this CA. Here we use `./`;
   1. `certificate` is this CA's certificate. Here we use `$dir/cacert/root.crt`;
   1. `crl` is the current CRL file. Here we use `$dir/crl/root.crl`;
   1. `private_key` is this CA's private key. Here we use `$dir/cacert/private/root.key`;
   1. Uncomment `copy_extensions`: this copies the extensions in the CSR that the certificate doesn't already have, without overriding the entries specified by `x509_extensions` in the `[ ca_root ]` section;
   1. Set `default_days` to `3650`: this CA issues certificates valid for 10 years by default;
   1. Set `policy` to `policy_default`;
1. After the `[ policy_anything ]` section, add a new `[ policy_default ]` section and edit it to read:

   ```ini
   [ policy_default ]
   countryName     = supplied
   stateOrProvinceName = supplied
   localityName        = optional
   organizationName        = supplied
   organizationalUnitName  = optional
   commonName          = supplied
   emailAddress        = optional
   ```

   Here:
   - `supplied` means the CSR to be signed must contain the field;
   - `optional` means the field is optional.

   Change these to suit your needs.

1. Edit the `[ req ]` section:
   1. `default_bits` is the length of the new RSA private key generated along with the CSR. Here we use `4096`;
   1. `default_keyfile` is where the private key goes when no related option is given. Here we use `private.key`;
   1. Set `x509_extensions` to `v3_req`;
1. Edit the `[ req_distinguished_name ]` section:
   1. I commented out all the entries ending in `_default`, `_min` and `_max`, because they caused errors;
   1. `countryName` is the two-letter country code. Here we use `CN`;
   1. `stateOrProvinceName` is the state or province name. Here we use `Beijing`;
   1. `localityName` is the locality name (usually the city). Here we comment it out and leave it empty;
   1. `0.organizationName` is the organization name. Here we use `wxx9248.tk`;
   1. `organizationalUnitName` is the department name. Here we comment it out and leave it empty;
   1. `commonName` is the common name, usually a fully qualified domain name (FQDN) or the CA's name. Here we use `wxx9248 Root Certification Authority`;
   1. `emailAddress` is the email address. Here we use `wxx9248@qq.com`
1. Edit the `[ usr_cert ]` section:
   1. Set `basicConstraints` to `critical, CA:TRUE`, because we'll use this CA to issue subordinate CA certificates;
   1. Uncomment `keyUsage` and set its value to `nonRepudiation, digitalSignature, keyCertSign, cRLSign`;
1. Edit the `[ v3_req ]` section:
   1. Set `basicConstraints` to `critical, CA:TRUE`, because we're requesting this CA as a CA;
   1. Set `keyUsage` to `nonRepudiation, digitalSignature, keyCertSign, cRLSign`;

#### Creating the Root CA Certificate

> The root CA certificate is the source of every chain of trust and is extremely important. In this whole world it has no one but you, so take good care of it (just kidding)

1. Generate a private key\
   Use OpenSSL's `genrsa` module to generate a 4096-bit RSA private key named `root.key`, in PEM format (PKCS#1 on OpenSSL 1.x, PKCS#8 on OpenSSL 3), encrypted with `AES-256-CBC`:
   ```bash
   openssl genrsa -aes-256-cbc -out cacert/private/root.key 4096
   ```
1. Generate a certificate signing request (CSR) file\
   Use OpenSSL's `req` module to generate a CSR file named `root.csr`, in PKCS#10/PEM format:
   ```bash
   openssl req -new -key cacert/private/root.key -out cacert/root.csr -config root.cnf
   ```
1. Issue the self-signed certificate

   > Note: normally, issuing a certificate means sending the CSR file to a CA for review, but the root CA has no parent CA, so we have to self-sign.

   Use OpenSSL's `x509` module to issue the certificate, valid for about 100 years, as a certificate file named `root.crt`, in X.509/PEM format:

   ```bash
   openssl x509 -req -days 36500 -in cacert/root.csr -signkey cacert/private/root.key -out cacert/root.crt -extfile root.cnf
   ```

### Setting Up CRL/OCSP Servers

#### Certificate Revocation Lists (CRL)

CRLs play a very important role in public key infrastructure (PKI): they keep a CA in control of the certificates it issues. If a certificate is issued without a CRL specified, it can't be revoked early and can only wait to expire. And if that certificate's private key leaks while it's still valid, the result is disastrous (and out of control).

> The root CA set up above is used for the demonstration here.

1. Generate a CRL

   > Note: a new CRL must be generated before the current one expires

   Use OpenSSL's `ca` module to generate a CRL file named `root.crl`:

   ```bash
   openssl ca -gencrl -out crl/root.crl -config root.cnf
   ```

1. Edit the OpenSSL configuration file
   1. Suppose the public URL is `https://crl.wxx9248.tk/root.crl`;
   1. Edit the `[ usr_cert ]` section of `root.cnf` and add the following at the end of the section:

      ```ini
      crlDistributionPoints = cdp

      [ cdp ]
      fullname = @cdp_uri

      [ cdp_uri ]
      URI.1 = https://crl.wxx9248.tk/root.crl
      ```

   1. From then on, this CA's CRL information is written into every certificate it issues.
1. Revoke a certificate
   ```bash
   openssl ca -revoke certs/random.crt -config root.cnf
   ```

#### Online Certificate Status Protocol (OCSP)

A CRL has to specify an update interval, usually 30 days. Browsers update their local copy of the CRL at the next update time the CRL indicates. But if a certificate is revoked within the update interval, browsers won't find out right away, which leaves some risk. OCSP exists to make up for this weakness of CRLs. When a browser receives a certificate, it sends a request to the OCSP server to check the certificate's status, and the server looks it up in its database and answers immediately. Also, OCSP only answers with the revocation information for the certificate in question, not the whole revocation list, so it's more efficient too.

> OpenSSL's `ocsp` module can act as a simple OCSP responder, but I'll skip setting up an OCSP server here ~~(lazy~~

### Creating a Subordinate CA

> This time let's generate an ECC certificate, for a change of flavor (just kidding)

#### Setting Up the Working Directory

> The directory structure is the same as the root CA's. See [Creating the Root CA](#creating-the-root-ca)

#### Writing the OpenSSL Configuration File

1. Copy `root.cnf` into the subordinate CA's working directory as `ecc.cnf`, and edit that copy;
1. Edit the `[ ca ]` section: change the value of `default_ca` to `ca_ecc`;
1. Rename the `[ ca_root ]` section to `[ ca_ecc ]`;
1. Edit the `[ ca_ecc ]` section:
   1. `certificate` uses `$dir/cacert/ecc.crt`;
   1. `crl` uses `$dir/crl/ecc.crl`;
   1. `private_key` uses `$dir/cacert/private/ecc.key`;
   1. Keep `copy_extensions` as `copy`: don't set it to `copyall`, or the entries in the CSR will override `x509_extensions`, and applicants could get this CA to issue CA certificates;
   1. Set `default_days` to `365`: this CA issues certificates valid for 1 year by default;
1. Edit the `[ req_distinguished_name ]` section: `commonName` uses `wxx9248 ECC Certification Authority`;
1. Edit the `[ usr_cert ]` section:
   1. Set `basicConstraints` to `critical, CA:FALSE`: this CA doesn't issue subordinate CA certificates, only user certificates;
   1. Set `keyUsage` to `critical, nonRepudiation, keyEncipherment, digitalSignature`;
1. Edit the `[ cdp_uri ]` section: set `URI.1` to `https://crl.wxx9248.tk/ecc.crl`;

#### Creating the Subordinate CA Certificate

1. Generate an ECC private key\
   Use OpenSSL's `ecparam` module to generate an ECC private key on the curve `secp384r1`, named `ecc.key`, in SEC1/PEM format;

   ```bash
   openssl ecparam -genkey -name secp384r1 -noout -out cacert/private/ecc.key
   ```

   > Note: SSL certificates generally use the ECC curve `prime256v1` or `secp384r1` (NIST standards). The former has a 256-bit key and the latter a 384-bit key.\
   > Other curves have poorer compatibility, so check that your clients support them before using them.

1. Generate a certificate signing request (CSR) file\
   Use OpenSSL's `req` module to generate a CSR file named `ecc.csr`, in PKCS#10/PEM format:
   ```bash
   openssl req -new -key cacert/private/ecc.key -out cacert/ecc.csr -config ecc.cnf
   ```
1. Issue the certificate with the root CA\
   Copy or link `ecc.csr` into the **root CA**'s working directory, and run this in the root CA's working directory:
   ```bash
   openssl ca -in ecc.csr -out ecc.crt -config root.cnf -notext
   ```
   OpenSSL then prints the CSR's information and asks whether to sign the certificate. Enter `y` twice to sign it, and the certificate is written to `ecc.crt`.\
   After that, all we need to do is copy `ecc.crt` into the `cacert` folder in the subordinate CA's working directory, and the subordinate CA is deployed.

### Issuing User Certificates with the Subordinate CA

> Here we'll assume we're issuing OpenVPN server and client certificates

1. Generate a private key named `ovpn_server.key`;
1. Write a simplified configuration file:
   ```ini
   [ req ]
   distinguished_name  = req_distinguished_name
   req_extensions  = v3_req
   prompt = no

   [ req_distinguished_name ]
   countryName         = CN
   stateOrProvinceName     = Beijing
   #localityName           =
   0.organizationName          = wxx9248.tk
   #1.organizationName     = Second Organization Name (eg, company)
   #organizationalUnitName     = wxx9248.tk
   commonName              = OpenVPN Server Certificate
   emailAddress            = wxx9248@qq.com

   [ v3_req ]
   basicConstraints = critical, CA:FALSE
   keyUsage = critical, nonRepudiation, keyEncipherment, keyAgreement
   extendedKeyUsage = serverAuth, clientAuth
   ```
1. Generate the CSR;
1. Copy the CSR into the subordinate CA's working directory and issue the certificate.
1. Combine the subordinate CA's certificate and the user certificate into a full-chain certificate named `ovpn_server_fullchain.crt`:
   ```bash
   cat ovpn_server.crt ecc.crt >ovpn_server_fullchain.crt
   ```

## 0x03 Closing Thoughts

This post looks simple, but it actually took me a long time to write. The main reasons:

1. OpenSSL's configuration file is a mess... many entries have confusing names, and the documentation doesn't clearly explain how these similar-looking entries differ, so you can't learn exactly what an entry does from the documentation alone. You only find out by trying many times and comparing the results;
1. Information online is all over the place, and it's hard to tell which parts are accurate. I pieced together what I believe is an accurate understanding from many articles and many Stack Overflow answers. Of course, it won't be perfectly accurate either, so I'd welcome corrections from people who know better.

[^codeOpenSSLConfigTemplate]:
    ```ini
    #
    # OpenSSL example configuration file.
    # See doc/man5/config.pod for more info.
    #
    # This is mostly being used for generation of certificate requests,
    # but may be used for auto loading of providers

    # Note that you can include other files from the main configuration
    # file using the .include directive.
    #.include filename

    # This definition stops the following lines choking if HOME isn't
    # defined.
    HOME            = .

    # Use this in order to automatically load providers.
    openssl_conf = openssl_init

    # Comment this out if you deliberately want to ignore
    # configuration errors
    config_diagnostics = 1

    # Extra OBJECT IDENTIFIER info:
    # oid_file       = $ENV::HOME/.oid
    oid_section = new_oids

    # To use this configuration file with the "-extfile" option of the
    # "openssl x509" utility, name here the section containing the
    # X.509v3 extensions to use:
    # extensions        =
    # (Alternatively, use a configuration file that has only
    # X.509v3 extensions in its main [= default] section.)

    [ new_oids ]
    # We can add new OIDs in here for use by 'ca', 'req' and 'ts'.
    # Add a simple OID like this:
    # testoid1=1.2.3.4
    # Or use config file substitution like this:
    # testoid2=${testoid1}.5.6

    # Policies used by the TSA examples.
    tsa_policy1 = 1.2.3.4.1
    tsa_policy2 = 1.2.3.4.5.6
    tsa_policy3 = 1.2.3.4.5.7

    # For FIPS
    # Optionally include a file that is generated by the OpenSSL fipsinstall
    # application. This file contains configuration data required by the OpenSSL
    # fips provider. It contains a named section e.g. [fips_sect] which is
    # referenced from the [provider_sect] below.
    # Refer to the OpenSSL security policy for more information.
    # .include fipsmodule.cnf

    [openssl_init]
    providers = provider_sect

    # List of providers to load
    [provider_sect]
    default = default_sect
    # The fips section name should match the section name inside the
    # included fipsmodule.cnf.
    # fips = fips_sect

    [default_sect]
    # activate = 1

    ####################################################################
    [ ca ]
    default_ca  = CA_default        # The default ca section

    ####################################################################
    [ CA_default ]

    dir     = ./demoCA      # Where everything is kept
    certs       = $dir/certs        # Where the issued certs are kept
    crl_dir     = $dir/crl      # Where the issued crl are kept
    database    = $dir/index.txt    # database index file.
    #unique_subject = no            # Set to 'no' to allow creation of
                        # several certs with same subject.
    new_certs_dir   = $dir/newcerts     # default place for new certs.

    certificate = $dir/cacert.pem   # The CA certificate
    serial      = $dir/serial       # The current serial number
    crlnumber   = $dir/crlnumber    # the current crl number
                        # must be commented out to leave a V1 CRL
    crl     = $dir/crl.pem      # The current CRL
    private_key = $dir/private/cakey.pem# The private key

    x509_extensions = usr_cert      # The extensions to add to the cert

    # Comment out the following two lines for the "traditional"
    # (and highly broken) format.
    name_opt    = ca_default        # Subject Name options
    cert_opt    = ca_default        # Certificate field options

    # Extension copying option: use with caution.
    # copy_extensions = copy

    # Extensions to add to a CRL. Note: Netscape communicator chokes on V2 CRLs
    # so this is commented out by default to leave a V1 CRL.
    # crlnumber must also be commented out to leave a V1 CRL.
    # crl_extensions    = crl_ext

    default_days    = 365           # how long to certify for
    default_crl_days= 30            # how long before next CRL
    default_md  = default       # use public key default MD
    preserve    = no            # keep passed DN ordering

    # A few difference way of specifying how similar the request should look
    # For type CA, the listed attributes must be the same, and the optional
    # and supplied fields are just that :-)
    policy      = policy_match

    # For the CA policy
    [ policy_match ]
    countryName     = match
    stateOrProvinceName = match
    organizationName    = match
    organizationalUnitName  = optional
    commonName      = supplied
    emailAddress        = optional

    # For the 'anything' policy
    # At this point in time, you must list all acceptable 'object'
    # types.
    [ policy_anything ]
    countryName     = optional
    stateOrProvinceName = optional
    localityName        = optional
    organizationName    = optional
    organizationalUnitName  = optional
    commonName      = supplied
    emailAddress        = optional

    ####################################################################
    [ req ]
    default_bits        = 2048
    default_keyfile     = privkey.pem
    distinguished_name  = req_distinguished_name
    attributes      = req_attributes
    x509_extensions = v3_ca # The extensions to add to the self signed cert

    # Passwords for private keys if not present they will be prompted for
    # input_password = secret
    # output_password = secret

    # This sets a mask for permitted string types. There are several options.
    # default: PrintableString, T61String, BMPString.
    # pkix   : PrintableString, BMPString (PKIX recommendation before 2004)
    # utf8only: only UTF8Strings (PKIX recommendation after 2004).
    # nombstr : PrintableString, T61String (no BMPStrings or UTF8Strings).
    # MASK:XXXX a literal mask value.
    # WARNING: ancient versions of Netscape crash on BMPStrings or UTF8Strings.
    string_mask = utf8only

    # req_extensions = v3_req # The extensions to add to a certificate request

    [ req_distinguished_name ]
    countryName         = Country Name (2 letter code)
    countryName_default     = AU
    countryName_min         = 2
    countryName_max         = 2

    stateOrProvinceName     = State or Province Name (full name)
    stateOrProvinceName_default = Some-State

    localityName            = Locality Name (eg, city)

    0.organizationName      = Organization Name (eg, company)
    0.organizationName_default  = Internet Widgits Pty Ltd

    # we can do this but it is not needed normally :-)
    #1.organizationName     = Second Organization Name (eg, company)
    #1.organizationName_default = World Wide Web Pty Ltd

    organizationalUnitName      = Organizational Unit Name (eg, section)
    #organizationalUnitName_default =

    commonName          = Common Name (e.g. server FQDN or YOUR name)
    commonName_max          = 64

    emailAddress            = Email Address
    emailAddress_max        = 64

    # SET-ex3           = SET extension number 3

    [ req_attributes ]
    challengePassword       = A challenge password
    challengePassword_min       = 4
    challengePassword_max       = 20

    unstructuredName        = An optional company name

    [ usr_cert ]

    # These extensions are added when 'ca' signs a request.

    # This goes against PKIX guidelines but some CAs do it and some software
    # requires this to avoid interpreting an end user certificate as a CA.

    basicConstraints=CA:FALSE

    # This is typical in keyUsage for a client certificate.
    # keyUsage = nonRepudiation, digitalSignature, keyEncipherment

    # PKIX recommendations harmless if included in all certificates.
    subjectKeyIdentifier=hash
    authorityKeyIdentifier=keyid,issuer

    # This stuff is for subjectAltName and issuerAltname.
    # Import the email address.
    # subjectAltName=email:copy
    # An alternative to produce certificates that aren't
    # deprecated according to PKIX.
    # subjectAltName=email:move

    # Copy subject details
    # issuerAltName=issuer:copy

    # This is required for TSA certificates.
    # extendedKeyUsage = critical,timeStamping

    [ v3_req ]

    # Extensions to add to a certificate request

    basicConstraints = CA:FALSE
    keyUsage = nonRepudiation, digitalSignature, keyEncipherment

    [ v3_ca ]

    # Extensions for a typical CA

    # PKIX recommendation.

    subjectKeyIdentifier=hash

    authorityKeyIdentifier=keyid:always,issuer

    basicConstraints = critical,CA:true

    # Key usage: this is typical for a CA certificate. However since it will
    # prevent it being used as an test self-signed certificate it is best
    # left out by default.
    # keyUsage = cRLSign, keyCertSign

    # Include email address in subject alt name: another PKIX recommendation
    # subjectAltName=email:copy
    # Copy issuer details
    # issuerAltName=issuer:copy

    # DER hex encoding of an extension: beware experts only!
    # obj=DER:02:03
    # Where 'obj' is a standard or added object
    # You can even override a supported extension:
    # basicConstraints= critical, DER:30:03:01:01:FF

    [ crl_ext ]

    # CRL extensions.
    # Only issuerAltName and authorityKeyIdentifier make any sense in a CRL.

    # issuerAltName=issuer:copy
    authorityKeyIdentifier=keyid:always

    [ proxy_cert_ext ]
    # These extensions should be added when creating a proxy certificate

    # This goes against PKIX guidelines but some CAs do it and some software
    # requires this to avoid interpreting an end user certificate as a CA.

    basicConstraints=CA:FALSE

    # This is typical in keyUsage for a client certificate.
    # keyUsage = nonRepudiation, digitalSignature, keyEncipherment

    # PKIX recommendations harmless if included in all certificates.
    subjectKeyIdentifier=hash
    authorityKeyIdentifier=keyid,issuer

    # This stuff is for subjectAltName and issuerAltname.
    # Import the email address.
    # subjectAltName=email:copy
    # An alternative to produce certificates that aren't
    # deprecated according to PKIX.
    # subjectAltName=email:move

    # Copy subject details
    # issuerAltName=issuer:copy

    # This really needs to be in place for it to be a proxy certificate.
    proxyCertInfo=critical,language:id-ppl-anyLanguage,pathlen:3,policy:foo

    ####################################################################
    [ tsa ]

    default_tsa = tsa_config1   # the default TSA section

    [ tsa_config1 ]

    # These are used by the TSA reply generation only.
    dir     = ./demoCA      # TSA root directory
    serial      = $dir/tsaserial    # The current serial number (mandatory)
    crypto_device   = builtin       # OpenSSL engine to use for signing
    signer_cert = $dir/tsacert.pem  # The TSA signing certificate
                        # (optional)
    certs       = $dir/cacert.pem   # Certificate chain to include in reply
                        # (optional)
    signer_key  = $dir/private/tsakey.pem # The TSA private key (optional)
    signer_digest  = sha256         # Signing digest to use. (Optional)
    default_policy  = tsa_policy1       # Policy if request did not specify it
                        # (optional)
    other_policies  = tsa_policy2, tsa_policy3  # acceptable policies (optional)
    digests     = sha1, sha256, sha384, sha512  # Acceptable message digests (mandatory)
    accuracy    = secs:1, millisecs:500, microsecs:100  # (optional)
    clock_precision_digits  = 0 # number of digits after dot. (optional)
    ordering        = yes   # Is ordering defined for timestamps?
                    # (optional, default: no)
    tsa_name        = yes   # Must the TSA name be included in the reply?
                    # (optional, default: no)
    ess_cert_id_chain   = no    # Must the ESS cert id chain be included?
                    # (optional, default: no)
    ess_cert_id_alg     = sha1  # algorithm to compute certificate
                    # identifier (optional, default: sha1)

    [insta] # CMP using Insta Demo CA
    # Message transfer
    server = pki.certificate.fi:8700
    # proxy = # set this as far as needed, e.g., http://192.168.1.1:8080
    # tls_use = 0
    path = pkix/

    # Server authentication
    recipient = "/C=FI/O=Insta Demo/CN=Insta Demo CA" # or set srvcert or issuer
    ignore_keyusage = 1 # potentially needed quirk
    unprotected_errors = 1 # potentially needed quirk
    extracertsout = insta.extracerts.pem

    # Client authentication
    ref = 3078 # user identification
    secret = pass:insta # can be used for both client and server side

    # Generic message options
    cmd = ir # default operation, can be overridden on cmd line with, e.g., kur

    # Certificate enrollment
    subject = "/CN=openssl-cmp-test"
    newkey = insta.priv.pem
    out_trusted = insta.ca.crt
    certout = insta.cert.pem

    [pbm] # Password-based protection for Insta CA
    # Server and client authentication
    ref = $insta::ref # 3078
    secret = $insta::secret # pass:insta

    [signature] # Signature-based protection for Insta CA
    # Server authentication
    trusted = insta.ca.crt # does not include keyUsage digitalSignature

    # Client authentication
    secret = # disable PBM
    key = $insta::newkey # insta.priv.pem
    cert = $insta::certout # insta.cert.pem

    [ir]
    cmd = ir

    [cr]
    cmd = cr

    [kur]
    # Certificate update
    cmd = kur
    oldcert = $insta::certout # insta.cert.pem

    [rr]
    # Certificate revocation
    cmd = rr
    oldcert = $insta::certout # insta.cert.pem
    ```
