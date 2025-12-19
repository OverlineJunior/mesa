<div align="center">
  <img src="assets/toucan.png" width="350" />
  <div>An opinionated Entity Component System framework for Roblox-TS</div>
</div>

---

## Testing Workflow

Given `mesa` and a test game `mesa-test`, in order to automatically send changes over, you must first follow the steps below a single time only:

+ On `mesa`, run `npm run build`, then `yalc publish`
+ On `mesa-test`, run `yalc add @rbxts/mesa`, then `npm install`

Then, in order to start testing `mesa` on `mesa-test`, run `npm run watch` on `mesa`.

### Fallback

In case `yalc` fails, the script `packInstall` works as a fallback, packaging `mesa` and installing it on `mesa-test`. Just remember to update it to reference the right test game.
