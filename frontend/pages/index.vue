<script setup lang="ts">
  import MdiGithub from "~icons/mdi/github";
  import MdiTwitter from "~icons/mdi/twitter";
  import MdiDiscord from "~icons/mdi/discord";
  import MdiFolder from "~icons/mdi/folder";
  import MdiAccount from "~icons/mdi/account";
  import MdiAccountPlus from "~icons/mdi/account-plus";
  import MdiLogin from "~icons/mdi/login";
  import MdiArrowRight from "~icons/mdi/arrow-right";
  import MdiLock from "~icons/mdi/lock";

  useHead({
    title: "Homebox | 整理和标记您的物品",
  });

  definePageMeta({
    layout: "empty",
    middleware: [
      () => {
        const ctx = useAuthContext();
        if (ctx.isAuthorized()) {
          return "/home";
        }
      },
    ],
  });

  const ctx = useAuthContext();

  const api = usePublicApi();
  const toast = useNotifier();

  const { data: status } = useAsyncData(async () => {
    const { data } = await api.status();

    if (data.demo) {
      username.value = "demo@example.com";
      password.value = "demo";
    }
    return data;
  });

  whenever(status, status => {
    if (status?.demo) {
      email.value = "demo@example.com";
      loginPassword.value = "demo";
    }
  });

  const route = useRoute();
  const router = useRouter();

  const username = ref("");
  const email = ref("");
  const password = ref("");
  const canRegister = ref(false);
  const remember = ref(false);

  const groupToken = computed<string>({
    get() {
      const params = route.query.token;

      if (typeof params === "string") {
        return params;
      }

      return "";
    },
    set(v) {
      router.push({
        query: {
          token: v,
        },
      });
    },
  });

  async function registerUser() {
    loading.value = true;
    const { error } = await api.register({
      name: username.value,
      email: email.value,
      password: password.value,
      token: groupToken.value,
    });

    if (error) {
      toast.error("注册用户时出现问题");
      return;
    }

    toast.success("用户注册成功");

    loading.value = false;
    registerForm.value = false;
  }

  onMounted(() => {
    if (groupToken.value !== "") {
      registerForm.value = true;
    }
  });

  const loading = ref(false);
  const loginPassword = ref("");

  async function login() {
    loading.value = true;
    const { error } = await ctx.login(api, email.value, loginPassword.value, remember.value);

    if (error) {
      toast.error("邮箱或密码无效");
      loading.value = false;
      return;
    }

    toast.success("登录成功");

    navigateTo("/home");
    loading.value = false;
  }

  const [registerForm, toggleLogin] = useToggle();
</script>

<template>
  <div class="flex flex-col min-h-screen">
    <div class="fill-primary min-w-full absolute top-0 z-[-1]">
      <div class="bg-primary flex-col flex min-h-[20vh]" />
      <svg
        class="fill-primary drop-shadow-xl"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 1440 320"
        preserveAspectRatio="none"
      >
        <path
          fill-opacity="1"
          d="M0,32L80,69.3C160,107,320,181,480,181.3C640,181,800,107,960,117.3C1120,128,1280,224,1360,272L1440,320L1440,0L1360,0C1280,0,1120,0,960,0C800,0,640,0,480,0C320,0,160,0,80,0L0,0Z"
        ></path>
      </svg>
    </div>
    <div>
      <header class="p-4 sm:px-6 lg:p-14 sm:py-6 sm:flex sm:items-end mx-auto">
        <div>
          <h2 class="mt-1 text-4xl font-bold tracking-tight text-neutral-content sm:text-5xl lg:text-6xl flex">
            HomeB
            <AppLogo class="w-12 -mb-4" />
            x
          </h2>
          <p class="ml-1 text-lg text-base-content/50">跟踪、整理和管理您的物品。</p>
        </div>
        <div class="flex mt-6 sm:mt-0 gap-4 ml-auto text-neutral-content">
          <a class="tooltip" data-tip="项目 Github" href="https://github.com/hay-kot/homebox" target="_blank">
            <MdiGithub class="h-8 w-8" />
          </a>
          <a href="https://twitter.com/haybytes" class="tooltip" data-tip="关注开发者" target="_blank">
            <MdiTwitter class="h-8 w-8" />
          </a>
          <a href="https://discord.gg/tuncmNrE4z" class="tooltip" data-tip="加入 Discord" target="_blank">
            <MdiDiscord class="h-8 w-8" />
          </a>
          <a href="https://hay-kot.github.io/homebox/" class="tooltip" data-tip="阅读文档" target="_blank">
            <MdiFolder class="h-8 w-8" />
          </a>
        </div>
      </header>
      <div class="grid p-6 sm:place-items-center min-h-[50vh]">
        <div>
          <Transition name="slide-fade">
            <form v-if="registerForm" @submit.prevent="registerUser">
              <div class="card w-max-[500px] md:w-[500px] bg-base-100 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title text-2xl align-center">
                    <MdiAccount class="mr-1 w-7 h-7" />
                    注册
                  </h2>
                  <FormTextField v-model="email" label="设置您的邮箱？" />
                  <FormTextField v-model="username" label="您的姓名是什么？" />
                  <div v-if="!(groupToken == '')" class="pt-4 pb-1 text-center">
                    <p>您正在加入一个现有群组！</p>
                    <button type="button" class="text-xs underline" @click="groupToken = ''">
                      不想加入群组？
                    </button>
                  </div>
                  <FormPassword v-model="password" label="设置您的密码" />
                  <PasswordScore v-model:valid="canRegister" :password="password" />
                  <div class="card-actions justify-end">
                    <button
                      type="submit"
                      class="btn btn-primary mt-2"
                      :class="loading ? 'loading' : ''"
                      :disabled="loading || !canRegister"
                    >
                      注册
                    </button>
                  </div>
                </div>
              </div>
            </form>
            <form v-else @submit.prevent="login">
              <div class="card w-max-[500px] md:w-[500px] bg-base-100 shadow-xl">
                <div class="card-body">
                  <h2 class="card-title text-2xl align-center">
                    <MdiAccount class="mr-1 w-7 h-7" />
                    登录
                  </h2>
                  <template v-if="status && status.demo">
                    <p class="text-xs italic text-center">这是一个演示实例</p>
                    <p class="text-xs text-center"><b>邮箱</b> demo@example.com</p>
                    <p class="text-xs text-center"><b>密码</b> demo</p>
                  </template>
                  <FormTextField v-model="email" label="邮箱" />
                  <FormPassword v-model="loginPassword" label="密码" />
                  <div class="max-w-[140px]">
                    <FormCheckbox v-model="remember" label="记住我" />
                  </div>
                  <div class="card-actions justify-end">
                    <button
                      type="submit"
                      class="btn btn-primary btn-block"
                      :class="loading ? 'loading' : ''"
                      :disabled="loading"
                    >
                      登录
                    </button>
                  </div>
                </div>
              </div>
            </form>
          </Transition>
          <div class="text-center mt-6">
            <BaseButton
              v-if="status && status.allowRegistration"
              class="btn-primary btn-wide"
              @click="() => toggleLogin()"
            >
              <template #icon>
                <MdiAccountPlus v-if="!registerForm" class="w-5 h-5 swap-off" />
                <MdiLogin v-else class="w-5 h-5 swap-off" />
                <MdiArrowRight class="w-5 h-5 swap-on" />
              </template>
              {{ registerForm ? "登录" : "注册" }}
            </BaseButton>
            <p v-else class="text-base-content italic text-sm inline-flex items-center gap-2">
              <MdiLock class="w-4 h-4 inline-block" />
              注册已禁用
            </p>
          </div>
        </div>
      </div>
    </div>
    <footer v-if="status" class="mt-auto text-center w-full bottom-0 pb-4">
      <p class="text-center text-sm">Version: {{ status.build.version }} ~ Build: {{ status.build.commit }}</p>
    </footer>
  </div>
</template>

<style lang="css" scoped>
  .slide-fade-enter-active {
    transition: all 0.2s ease-out;
  }

  .slide-fade-enter-from,
  .slide-fade-leave-to {
    position: absolute;
    transform: translateX(20px);
    opacity: 0;
  }

  progress[value]::-webkit-progress-value {
    transition: width 0.5s;
  }
</style>
