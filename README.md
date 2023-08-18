# TermTrimmer

Source code for TermTrimmer chrome extension.

## Deployment Architecture

- 2x EC2 Servers
- At least 4x cores per server
- 9 Gunicorn workers per server: (2 x num_cores) + 1
- Load balance traffic between the 2 servers
- Setup autoscaling rules to account for usage spikes(?)

## Release Plan

Promote on Kickstarter and Indigogo first, offering free trial for supporters.

Release for $1/month on Chrome Web Store.

Offer free trial?

### Notes

Need to make logo and sort branding.
