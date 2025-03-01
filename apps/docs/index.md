<script setup>
    const cards = [
        {
            title: "Quickstart",
            url: "/quickstart",
            body: "No signup required. Get started in minutes."
        },
        {
            title: "Development",
            url: "/development/contributing",
            body: "Contribute to the project. We value every contribution."
        },
        {
            title: "Extensions",
            url: "/extensions",
            body: "Browse the list of extensions to see what's available."
        },
        {
            title: "Plugins",
            url: "/plugins",
            body: "Browse the list of plugins to see what's available."
        }
    ]
</script>

<h1 class="flex items-center gap-2 font-mono"><div class="i-heroicons-bolt-20-solid h-8 w-8 bg-yellow-500"></div> Hyprnote</h1>

_**Hackable AI notepad for meetings.** `Open source`, `local-first`, and `extensible`._

Hyprnote is made for people packed with meetings. It's a smart notepad that takes your raw note and turns them into a perfect meeting note. 

<div class="grid grid-cols-2 gap-4 my-8">
  <Card v-for="card in cards" :key="card.title" :title="card.title" :url="card.url" :body="card.body"/>
</div>

