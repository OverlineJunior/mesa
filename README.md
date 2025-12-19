<div align="center">
  <img src="assets/toucan.png" width="350" />
  <div>An opinionated Entity Component System framework for Roblox-TS</div>
</div>

# Toucan

**Toucan** is an opinionated [Entity Component System](https://github.com/SanderMertens/ecs-faq) framework for Roblox-TS that wraps over [Jecs](https://github.com/Ukendio/jecs) and [Planck](https://github.com/YetAnotherClown/planck), favoring developer experience over raw performance.

It was created as a way to remove the need of glueing together different ECS libraries and allowing the developer to start working on their actual game as soon as possible.

## Features

- **Fluent API:** abstracts away the concept of an ECS world in favor of a more concise way of manipulating entities, queries and other things[^1];

- **Hooks:** provides built-in topologically aware functions, such as `useDeltaTime` and `useThrottledMemo`;

- **Plugins:** enables better organization of components and systems by grouping them together, which in turn also allows for third-party plugins that are easy to integrate;

- **Phases:** inherited from Planck, systems are assigned to predefined phases[^2] in order to resolve dependencies between them;

- **Everything is an entity:** inherited from Jecs, components, resources and relationships are also entities, allowing you to assign them metadata and inspect them.

[^1]: This does come with the cost of a relatively lower performance (~20-40% less than Jecs; actual benchmarks will be done and documented when things get more stable).

[^2]: Having predefined phases is what allows for third-party plugins that are easy to integrate.

## Example

```ts
const Name = component<string>()
const Likes = component()

const orange = entity().set(Name, 'Orange')
const banana = entity().set(Name, 'Banana')
const carrot = entity().set(Name, 'Carrot')

const alice = entity()
    .set(Name, 'Alice')
    .set(pair(Likes, orange))
    .set(pair(Likes, banana))
    .set(pair(Likes, carrot))

query(pair(Likes, Wildcard)).forEach((likesSomething) => {
    const targets = likesSomething.targetsOf(Likes)
    const targetNames = targets.map((t) => t.get(Name)!).join(', ')
    print(`${likesSomething.get(Name)} likes ${targetNames}.`)
})
```

# Testing Workflow

Given `mesa` and a test game `mesa-test`, in order to automatically send changes over, you must first follow the steps below a single time only:

+ On `mesa`, run `npm run build`, then `yalc publish`
+ On `mesa-test`, run `yalc add @rbxts/mesa`, then `npm install`

Then, in order to start testing `mesa` on `mesa-test`, run `npm run watch` on `mesa`.

## Fallback

In case `yalc` fails, the script `packInstall` works as a fallback, packaging `mesa` and installing it on `mesa-test`. Just remember to update it to reference the right test game.
