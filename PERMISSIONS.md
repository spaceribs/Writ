# Permission Levels

Permission levels range between -1 and 100.

* `-1 ` - `none`: Shouldn't ever be read/written to database (passwords).
* `0  ` - `system`: Only accessible by the system.
* `9  ` - `admin owner`: Only accessible by admin and owner of the content.
* `10 ` - `admin`: Only accessible by admin users.
* `19 ` - `verified owner`: A verified user and owner of the content.
* `20 ` - `verified user`: Registered user that verified their email.
* `29 ` - `unverified owner`: Registered owner that hasn't verified their email.
* `30 ` - `unverified user`: Registered user that hasn't verified their email.
* `100` - `guest`: Publicly accessible.
