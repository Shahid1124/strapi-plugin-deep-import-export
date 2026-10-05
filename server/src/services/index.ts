import { createTransferService } from "./transfer"
import type { AppStrapi } from "./strapi/runtime"

export default {
  transfer: ({ strapi }: { strapi: AppStrapi }) => createTransferService(strapi),
}
