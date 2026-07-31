---
# https://vitepress.dev/reference/default-theme-home-page
layout: home

hero:
  name: 'RMF Industrial'
  text: 'Documentation'
  tagline: Fleet Management for Manufacturing and Logistics
  image:
    light: /icons/logo-light.svg
    dark: /icons/logo-dark.svg
  actions:
    - theme: brand
      text: What is RMF Industrial
      link: /guide/what-is-rmf2
    - theme: alt
      text: Quickstart
      link: /guide/getting-started
    - theme: alt
      text: Github
      link: https://github.com/ros-industrial/rmf_industrial

features:
  - icon:
      src: /icons/FcCamcorderPro.svg
    title: Simulation & Digital Twin
    details: Large Scale Photorealistic Simulation / Digital Twin in Unreal Engine.
    link: /guide/simulation
  - icon:
      src: /icons/FcApproval.svg
    title: VDA5050 Support
    details: Out-of-box support and tooling for VDA5050 Compatibility.
    link: /guide/vda5050
  - icon:
      src: /icons/FcMindMap.svg
    title: Multi-Agent Path Finding and Execution
    details: Scalable route planning and deterministic execution.
    link: /guide/mapf
  - icon:
      src: /icons/FcWorkflow.svg
    title: Workflow Orchestration
    details: Effortless Workflow definition and customization.
    link: /guide/task-orchestrator
  - icon:
      src: /icons/FcTimeline.svg
    title: Task Scheduling
    details: Highly Efficient Task Scheduling for Machines, Humanoids and Mobile Robots.
    link: /guide/scheduler
  - icon: 🖥️
    title: Web Dashboard & UI
    details: React Library and Sample Web Dashboard for monitoring and control.
    link: /guide/ui
  # - icon: 🚀
  #   title: Fast Deployment
  #   details: Continuous Delivery through building, testing, and shipping isolated features as microservices.
---

## What is this?

A modular fleet management system for manufacturing and logistics — a photorealistic
**Unreal Engine 5 Simulation** standing in for the physical robots, **VDA5050** AGV
communication, **MAPF** multi-agent path finding, and a Crossflow **Task Orchestrator**.
Each piece runs as its own container, so you can swap, test, or deploy any module on its own.

→ See [What is RMF Industrial](/guide/what-is-rmf2) for the full breakdown.

## How these docs work

Read them in order:

1. **[What is RMF Industrial](/guide/what-is-rmf2)** — the big picture and the modules
2. **[Architecture](/guide/architecture)** — how the pieces fit together
3. **[Getting started](/guide/getting-started)** — build the images and bring the stack up
4. **[Demos](/guide/demos)** — run it end to end

From there, each module has its own page — **[Simulation](/guide/simulation)**,
**[VDA5050](/guide/vda5050)**, **[MAPF](/guide/mapf)**,
**[Task Orchestrator](/guide/task-orchestrator)**, **[Scheduler](/guide/scheduler)**, and
**[UI](/guide/ui)** — dive into whichever you need.
