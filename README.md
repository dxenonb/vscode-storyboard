# Story board / Sequence Graph README

2D Visual flowgraph editor for Visual Studio Code, originally designed for planning writing/story ideas, but likely useful for any concurrent/complex process that might be difficult to write out in a linear fashion (e.g. in a traditional text document). 

Extension title is a work in progress.

## Features

Use CMD+Shift+P and run the "Create Sequence Graph Board" command to get started. Right click to create nodes.

Open an existing board by navigating to the JSON file and running the "Open Sequence Graph Board" command.

Currently supported:

 * Saving/loading board files (only autosave is supported right now)
 * Creating new board files
 * Restoring unsaved graphs (incomplete/unpolished)
 * Creating and editing nodes and their positions
 * Wire dragging (you can't make connections yet!, but almost there ;^) )

I plan to support split views, efficient zooming and panning for large graphs/boards, comments, and resizeable nodes.

## Extension Settings

This extension contributes the following settings:

* none yet added

## Known Issues

Major missing features:

 * Connecting nodes
 * Dragging/panning/scaling the view (easy in theory, always a pain; I've done it twice before, so low priority)
 * Comments/grouping
 * Multiple editors/split views of the same graph

## Release Notes

Development is still underway.

### 1.0.0

Not yet released.
