---
layout: default
---

<meta name="viewport" content="width=device-width, initial-scale=1">
<link href="/assets/css/style.css" rel="stylesheet">
<script src="https://cdnjs.cloudflare.com/ajax/libs/web3/1.7.0-rc.0/web3.min.js"></script>
<script src="https://cdnjs.cloudflare.com/ajax/libs/handlebars.js/4.7.7/handlebars.min.js"></script>
<script src="https://unpkg.com/f0js@0.0.12/dist/f0.js"></script>
<script id="template" type="text/x-handlebars-template">
  <img src="{{image}}">
  <h1>{{title}}</h1>
  <table class='invites'>
  <tr>
    <th>mint price</th>
    <th>mint limit</th>
    <th>Invite</th>
  </tr>
  {{#each items}}
    <tr>
      <td>{{eth}} ETH</td>
      <td>{{limit}}</td>
      <td><a class='btn' href="mint#address={{address}}&key={{key}}">Go</td</a></td>
    </tr>
  {{/each}}
  </table>
</script>
  <script src="/assets/js/function1.js"></script>