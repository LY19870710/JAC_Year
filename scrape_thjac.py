#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
Scrape th-jac.com paperlist to get all articles per category.
Run from the browser-use workspace.
"""
import json
import time
import sys
sys.path.insert(0, '/c/Users/LIYANG/AppData/Local/hermes/cache/web')

# This script is designed to be run as a browser_exec script
# It needs to be called via the browser tool

# The plan: click each of 20 category buttons and extract titles
# We'll output JSON

print("Starting scrape...")
