---
layout: page
title: Archive
icon: book
---

{% for post in site.posts %}
  {% capture month %}{{ post.date | date: '%m%Y' }}{% endcapture %}
  {% capture nmonth %}{{ post.next.date | date: '%m%Y' }}{% endcapture %}
    {% if month != nmonth %}
<hr/>
{{ post.date | date: '%B %Y' }}
    {% endif %}
  <li>
    <a href="{{ post.url }}">{{ post.title }}</a>&nbsp;
    (<span class="time">{{ post.date | date: "%b %d" }}</span>)
  </li>
{% endfor %}
