---
layout: default
---

  <script src="https://cdnjs.cloudflare.com/ajax/libs/web3/1.7.0-rc.0/web3.min.js"></script>
  <script src="https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.7.7/handlebars.min.js"></script>
  <script src="https://unpkg.com/f0js@0.0.12/dist/f0.js"></script>
  <script id="template" type="text/x-handlebars-template">
    <div class="wrapper">
      <img src="{{image}}">
      <h1>{{title}}</h1>
      <ul class="downloads">
          <li>mintt price</li>
          <li>mint limit</li>
          <li>Invite</li>
        {{#each items}}
            <li><strong>{{eth}}</strong> ETH</li>
            <li><strong>{{limit}}</strong></li>
            <li><a href="mint#address={{address}}&key={{key}}"><strong>Go</strong></a></li>
        {{/each}}
      </ul>
    </div>
  </script>
  <script src="/assets/js/function1.js"></script>