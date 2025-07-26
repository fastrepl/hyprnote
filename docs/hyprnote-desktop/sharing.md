# Sharing

## Seamless sharing between team with access control

[Hyprnote Admin Server](https://docs.hyprnote.com/~/revisions/CR5fTBTKOERHhOdwmNqZ/hyprnote-admin-server/overview) is exactly what you're looking for.

## Other methods

<figure><img src="../.gitbook/assets/Screenshot 2025-07-14 at 12.26.15 AM.png" alt="" width="334"><figcaption></figcaption></figure>

### PDF

Basic support is done.

### Email

We support basic title pre-fill for now.



### Obsidian

. We have [**generated client**](https://github.com/fastrepl/hyprnote/tree/main/packages/obsidian) to interact with it.

{% stepper %}
{% step %}
### Install [**obsidian-local-rest-api**](https://github.com/coddingtonbear/obsidian-local-rest-api) plugin

[Click](obsidian://show-plugin?id=obsidian-local-rest-api) here to open Obsidian and install it.
{% endstep %}

{% step %}
### Enable HTTP in the Obsidian plugin settings

<div data-full-width="false"><figure><img src="../.gitbook/assets/Screenshot 2025-07-13 at 4.15.27 PM (2).png" alt="" width="563"><figcaption></figcaption></figure></div>


{% endstep %}

{% step %}
### Configure Hyprnote (Settings - Integrations)

<figure><img src="../.gitbook/assets/Screenshot 2025-07-13 at 4.15.39 PM.png" alt="" width="563"><figcaption></figcaption></figure>

Enable Obsidian, and copy-paste base-url, api-key, and configure other stuffs like base-folder.
{% endstep %}

{% step %}
### Now you can export note to Obsidian!



<figure><img src="../.gitbook/assets/Screenshot 2025-07-14 at 12.21.03 AM (1).png" alt="" width="333"><figcaption></figcaption></figure>
{% endstep %}
{% endstepper %}
