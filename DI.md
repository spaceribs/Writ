# Dependency Injection

These are just some notes about the item action dependency injection system, I'd like there to be some limited risk 
involved by the gamer when preforming certain actions. A few use cases:

You enter a place and you are told that a photograph hanging on the wall is slightly tilted. When you select to
straighten out the picture, it alerts you that the item requests to read/write the user somehow. The user must now
make a determination if it's worth the possible phishing/deletion of their inventory to activate the action.

## Libraries - No Permissions Requests Required

* `lodash` - Import lodash library.
* `chance` - Import chance library.
* `q` - Import promise library.
* `prompt` - Promise based user prompts that pause execution.
* `crypto` - Promise based encrypt/decrypt payloads.

## Implicitly Allowed Injections - No Permissions Requests Required

* `item` - The item can read/write itself according to validation.
* `user_name` - The item can access the name of the user.
* `place_name` - The item can access the name of the user.
* `place_id` - Get the ID of the current place.
* `applied` - If the item is applied to another item, this will be the reference for this item.

## Injections that Needs Permissions

If any of these permissions are rejected, the objects will return an error.

* `inventory` - The item can edit the inventory of the activating user.
* `user_id` - The item can get the ID of the user.
* `items` - The item can read/modify the other items in the current place.
* `passages` - The item can add and read validated passages to the current place.
* `client` - The item can force the client to do certain actions like going directly to a place.
* `limits` - The action can request a change in the limitations placed on it's own script execution.
* `timeout` - The action can start a timer to run actions at a specific later time.
* `messenge` - Promise based system for sending messages.

## Event Bindings for taken inventory items

Once an item is placed in your inventory, you implicitly trust all the above permissions. It also can become bound to
certain user events.

* `on_message` - Run action when a user gets a message from another user.
* `on_enter` - Run action when entering a place.
* `on_exit` - Run action when leaving a place.