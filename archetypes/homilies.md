+++
title = '{{ replace .File.ContentBaseName "-" " " | title }}'
description = '' # Required before publication; use summary separately for card copy.
date = {{ .Date }}
draft = true

# Required before publication. Use only registered values from CONTENT-MODEL.md.
liturgical_season = ''
liturgical_occasion = ''

# Add, remove, or repeat reading entries as the liturgy requires.
# Entries without a citation are not displayed.
[[readings]]
label = 'First Reading'
citation = ''

[[readings]]
label = 'Responsorial Psalm'
citation = ''

[[readings]]
label = 'Second Reading'
citation = ''

[[readings]]
label = 'Gospel'
citation = ''
+++
