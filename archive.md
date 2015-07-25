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
<h3>{{ post.date | date: '%B %Y' }}</h3>
    {% endif %}
  <li>
    <time datetime="{{ post.date | date_to_xmlschema }}" itemprop="datePublished">{{ post.date | date: "%b %d, %Y" }}</time></span> &raquo;
    <a href="{{ post.url }}">{{ post.title }}</a>
  </li>
{% endfor %}
