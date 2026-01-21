# Proximity API

Proximity is a high-performance Geo-Spatial API built with Node.js that finds the nearest points of interest to a given location.

**Live API URL:** [https://proximity-locater.vercel.app/]

## Core Features

-   **`POST /locations`**: Add a new named location with its latitude and longitude to the database.
-   **`GET /nearby`**: Given a user's latitude and longitude, find the N-closest locations instantly.

## The Technical Challenge: Performance at Scale

A key goal of this project was to solve the "N-closest points" problem efficiently.

### Version 1: The Naive Approach

The initial version of the `/nearby` endpoint used a brute-force method:
1.  Fetch **all** locations from the database.
2.  Calculate the distance to every single point.
3.  Sort the entire list.
4.  Return the top N results.

This approach has a time complexity of **O(n log n)** due to the sort, making it unscalable for large datasets.

### Version 2: The Optimized Solution (Spatial Indexing)

To dramatically improve performance, the second version implements an in-memory spatial index using a **k-d tree** (via the `kdbush` library).

1.  On server startup, all locations are loaded from the database into the k-d tree.
2.  When a request to `/nearby` is made, it performs a lookup on this data structure.

This optimized approach has a time complexity of **O(k log n)** (where k is the number of results), which is significantly faster and allows for real-time lookups even with thousands of points.
