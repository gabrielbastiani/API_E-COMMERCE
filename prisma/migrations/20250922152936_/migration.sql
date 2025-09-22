-- CreateEnum
CREATE TYPE "TypeUser" AS ENUM ('FISICA', 'JURIDICA');

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('EMPLOYEE', 'ADMIN', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('PAID', 'PENDING', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('CREDIT_CARD', 'DEBIT_CARD', 'BOLETO', 'PIX', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'RECEIVED', 'CONFIRMED', 'OVERDUE', 'REFUNDED', 'FAILED', 'SCHEDULED');

-- CreateEnum
CREATE TYPE "StatusUserEcommerce" AS ENUM ('DISPONIVEL', 'INDISPONIVEL');

-- CreateEnum
CREATE TYPE "StatusProduct" AS ENUM ('DISPONIVEL', 'INDISPONIVEL');

-- CreateEnum
CREATE TYPE "StatusDescriptionProduct" AS ENUM ('DISPONIVEL', 'INDISPONIVEL');

-- CreateEnum
CREATE TYPE "StatusVariant" AS ENUM ('DISPONIVEL', 'INDISPONIVEL');

-- CreateEnum
CREATE TYPE "ProductRelationType" AS ENUM ('VARIANT', 'SIMPLE');

-- CreateEnum
CREATE TYPE "DeliveryMethod" AS ENUM ('DOWNLOAD', 'EMAIL', 'STREAMING', 'API');

-- CreateEnum
CREATE TYPE "StatusReview" AS ENUM ('ANAILSE', 'APPROVED', 'FAILED');

-- CreateEnum
CREATE TYPE "Rating" AS ENUM ('ONE', 'TWO', 'THREE', 'FOUR', 'FIVE');

-- CreateEnum
CREATE TYPE "DiscountType" AS ENUM ('PERCENTAGE', 'FIXED', 'BOGO', 'FREE_SHIPPING');

-- CreateEnum
CREATE TYPE "PromotionScope" AS ENUM ('PRODUCT', 'VARIANT', 'CATEGORY', 'ORDER', 'SHIPPING');

-- CreateEnum
CREATE TYPE "PromotionStatus" AS ENUM ('ACTIVE', 'SCHEDULED', 'EXPIRED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "StatusMarketingPublication" AS ENUM ('Programado', 'Fim_da_programacao', 'Disponivel', 'Disponivel_programado', 'Indisponivel');

-- CreateEnum
CREATE TYPE "StatusPromotion" AS ENUM ('Programado', 'Fim_da_programacao', 'Disponivel', 'Disponivel_programado', 'Indisponivel');

-- CreateEnum
CREATE TYPE "Position" AS ENUM ('SLIDER', 'TOP_BANNER', 'SIDEBAR', 'MOSAICO', 'POPUP');

-- CreateEnum
CREATE TYPE "StatusBuyTogether" AS ENUM ('SIM', 'NAO');

-- CreateEnum
CREATE TYPE "StatusCommentOrder" AS ENUM ('PRIVATE', 'VISIBLE');

-- CreateEnum
CREATE TYPE "FilterType" AS ENUM ('RANGE', 'SELECT', 'MULTI_SELECT');

-- CreateEnum
CREATE TYPE "FilterDisplayStyle" AS ENUM ('SLIDER', 'DROPDOWN', 'CHECKBOX', 'RADIO', 'COLOR_PICKER');

-- CreateEnum
CREATE TYPE "FilterDataType" AS ENUM ('NUMBER', 'STRING', 'DATE', 'BOOLEAN');

-- CreateEnum
CREATE TYPE "MenuItemType" AS ENUM ('INTERNAL_LINK', 'EXTERNAL_LINK', 'CATEGORY', 'PRODUCT', 'CUSTOM_PAGE');

-- CreateEnum
CREATE TYPE "EmailProcessType" AS ENUM ('ORDER_PLACED', 'ORDER_PAID', 'ORDER_CANCELED', 'USER_CREATED', 'CUSTOMER_REGISTERED', 'PASSWORD_RECOVERY', 'SHIPPING_NOTIFICATION');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('INDEFINIDO', 'USER', 'CATEGORY', 'PRODUCT', 'MARKETING', 'ORDER', 'NEWSLETTER', 'CONTACT_FORM', 'CONTACT_ORDER', 'REPORT');

-- CreateEnum
CREATE TYPE "StatusCustomer" AS ENUM ('DISPONIVEL', 'INDISPONIVEL');

-- CreateEnum
CREATE TYPE "StatusCategory" AS ENUM ('DISPONIVEL', 'INDISPONIVEL');

-- CreateEnum
CREATE TYPE "ConditionType" AS ENUM ('FIRST_ORDER', 'CART_ITEM_COUNT', 'UNIQUE_VARIANT_COUNT', 'ZIP_CODE', 'PRODUCT_CODE', 'VARIANT_CODE', 'STATE', 'CATEGORY', 'CATEGORY_ITEM_COUNT', 'CATEGORY_VALUE', 'BRAND_VALUE', 'VARIANT_ITEM_COUNT', 'PRODUCT_ITEM_COUNT', 'PERSON_TYPE', 'USER', 'SUBTOTAL_VALUE', 'TOTAL_VALUE');

-- CreateEnum
CREATE TYPE "Operator" AS ENUM ('EQUAL', 'NOT_EQUAL', 'GREATER', 'GREATER_EQUAL', 'LESS', 'LESS_EQUAL', 'CONTAINS', 'NOT_CONTAINS', 'EVERY');

-- CreateEnum
CREATE TYPE "ActionType" AS ENUM ('FIXED_VARIANT_DISCOUNT', 'FIXED_PRODUCT_DISCOUNT', 'FREE_VARIANT_ITEM', 'FREE_PRODUCT_ITEM', 'PERCENT_CATEGORY', 'PERCENT_VARIANT', 'PERCENT_PRODUCT', 'PERCENT_BRAND_ITEMS', 'PERCENT_ITEM_COUNT', 'PERCENT_EXTREME_ITEM', 'PERCENT_SHIPPING', 'PERCENT_SUBTOTAL', 'PERCENT_TOTAL_NO_SHIPPING', 'PERCENT_TOTAL_PER_PRODUCT', 'FIXED_BRAND_ITEMS', 'FIXED_SHIPPING', 'FIXED_SUBTOTAL', 'FIXED_TOTAL_NO_SHIPPING', 'FIXED_TOTAL_PER_PRODUCT', 'MAX_SHIPPING_DISCOUNT');

-- CreateEnum
CREATE TYPE "DisplayType" AS ENUM ('SPOT', 'PRODUCT_PAGE');

-- CreateEnum
CREATE TYPE "QuestionStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'DELETED');

-- CreateTable
CREATE TABLE "ecommerceDatas" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "whatsapp" TEXT,
    "cnpj" TEXT,
    "cpf" TEXT,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "number" TEXT,
    "neighborhood" TEXT,
    "country" TEXT NOT NULL,
    "logo" TEXT,
    "favicon" TEXT,
    "privacy_policies" TEXT,
    "about_store" TEXT,
    "exchanges_and_returns" TEXT,
    "how_to_buy" TEXT,
    "shipping_delivery_time" TEXT,
    "faq" TEXT,
    "payment_methods" TEXT,
    "technical_assistance" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ecommerceDatas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "seoSettings" (
    "id" TEXT NOT NULL,
    "page" TEXT NOT NULL,
    "title" TEXT,
    "description" TEXT,
    "keywords" JSONB,
    "ogTitle" TEXT,
    "ogDescription" TEXT,
    "ogImages" JSONB,
    "ogImageWidth" INTEGER,
    "ogImageHeight" INTEGER,
    "ogImageAlt" TEXT,
    "twitterTitle" TEXT,
    "twitterDescription" TEXT,
    "twitterCreator" TEXT,
    "twitterImages" JSONB,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "seoSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "socialMedias" (
    "id" TEXT NOT NULL,
    "name_media" VARCHAR(725) NOT NULL,
    "link" TEXT,
    "logo_media" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "socialMedias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "themesSettings" (
    "id" TEXT NOT NULL,
    "colors" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "themesSettings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "usersEcommerce" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "status" "StatusUserEcommerce" NOT NULL DEFAULT 'DISPONIVEL',
    "role" "Role" NOT NULL DEFAULT 'EMPLOYEE',
    "photo" TEXT,
    "last_access" TIMESTAMPTZ(3),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usersEcommerce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passwordRecoveryUsersEcommerces" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "passwordRecoveryUsersEcommerces_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL,
    "asaas_customer_id" TEXT,
    "email" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "type_user" "TypeUser" NOT NULL DEFAULT 'FISICA',
    "cpf" TEXT,
    "cnpj" TEXT,
    "date_of_birth" TEXT,
    "sexo" TEXT NOT NULL,
    "state_registration" TEXT,
    "photo" TEXT,
    "newsletter" BOOLEAN NOT NULL DEFAULT false,
    "last_access" TIMESTAMPTZ(3),
    "status" "StatusCustomer" NOT NULL DEFAULT 'DISPONIVEL',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "passwordRecoveryUsersStores" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,

    CONSTRAINT "passwordRecoveryUsersStores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT,
    "metaTitle" TEXT,
    "metaDescription" TEXT,
    "keywords" JSONB,
    "brand" TEXT,
    "ean" TEXT,
    "description" TEXT NOT NULL,
    "skuMaster" TEXT,
    "price_of" DOUBLE PRECISION,
    "price_per" DOUBLE PRECISION NOT NULL,
    "weight" DOUBLE PRECISION,
    "length" DOUBLE PRECISION,
    "width" DOUBLE PRECISION,
    "height" DOUBLE PRECISION,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "view" INTEGER DEFAULT 0,
    "mainPromotion_id" TEXT,
    "buyTogether_id" TEXT,
    "status" "StatusProduct" NOT NULL DEFAULT 'DISPONIVEL',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productsVariants" (
    "id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "sku" TEXT NOT NULL,
    "price_of" DOUBLE PRECISION,
    "price_per" DOUBLE PRECISION NOT NULL,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "allowBackorders" BOOLEAN NOT NULL DEFAULT false,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "ean" TEXT,
    "mainPromotion_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productsVariants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productsVariantVideos" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "productVariant_id" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productsVariantVideos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productsVariantImages" (
    "id" TEXT NOT NULL,
    "productVariant_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productsVariantImages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variantsAttributes" (
    "id" UUID NOT NULL,
    "variant_id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "status" "StatusVariant" NOT NULL DEFAULT 'DISPONIVEL',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "variantsAttributes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "variantsAttributesimages" (
    "id" TEXT NOT NULL,
    "variantAttribute_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "variantsAttributesimages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productsRelations" (
    "id" TEXT NOT NULL,
    "parentProduct_id" UUID NOT NULL,
    "childProduct_id" UUID NOT NULL,
    "relationType" "ProductRelationType" NOT NULL DEFAULT 'VARIANT',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isRequired" BOOLEAN NOT NULL DEFAULT false,
    "product_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productsRelations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productsDescriptions" (
    "id" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "StatusDescriptionProduct" NOT NULL DEFAULT 'DISPONIVEL',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productsDescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productsImages" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "altText" TEXT,
    "product_id" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productsImages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productsVideos" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productsVideos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "questionsproducts" (
    "id" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "question" TEXT NOT NULL,
    "status" "QuestionStatus" NOT NULL DEFAULT 'PENDING',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "questionsproducts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "responsesquestionsoroduct" (
    "id" TEXT NOT NULL,
    "userEcommerce_id" TEXT NOT NULL,
    "questionProduct_id" TEXT NOT NULL,
    "response" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "responsesquestionsoroduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "startDate" TIMESTAMPTZ(3),
    "endDate" TIMESTAMPTZ(3),
    "is_processing" BOOLEAN NOT NULL DEFAULT false,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "hasCoupon" BOOLEAN NOT NULL DEFAULT true,
    "multipleCoupons" BOOLEAN NOT NULL DEFAULT false,
    "reuseSameCoupon" BOOLEAN NOT NULL DEFAULT false,
    "perUserCouponLimit" INTEGER,
    "totalCouponCount" INTEGER,
    "status" "StatusPromotion" NOT NULL DEFAULT 'Disponivel',
    "cumulative" BOOLEAN NOT NULL DEFAULT false,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_coupons" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "promotion_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_coupons_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_conditions" (
    "id" TEXT NOT NULL,
    "promotion_id" TEXT NOT NULL,
    "type" "ConditionType" NOT NULL,
    "operator" "Operator" NOT NULL,
    "value" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_conditions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_actions" (
    "id" TEXT NOT NULL,
    "promotion_id" TEXT NOT NULL,
    "type" "ActionType" NOT NULL,
    "params" JSONB NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_displays" (
    "id" TEXT NOT NULL,
    "promotion_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "type" "DisplayType" NOT NULL,
    "content" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_displays_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotion_badges" (
    "id" TEXT NOT NULL,
    "promotion_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_badges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productsViews" (
    "id" UUID NOT NULL,
    "product_id" UUID,
    "ipAddress" VARCHAR(45),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "productsViews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "promotionUsages" (
    "id" TEXT NOT NULL,
    "promotion_id" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "order_id" TEXT NOT NULL,
    "titlePromotion" TEXT,
    "discountApplied" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotionUsages_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categories" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "description" TEXT,
    "image" TEXT,
    "order" INTEGER NOT NULL DEFAULT 0,
    "parentId" TEXT,
    "status" "StatusCategory" NOT NULL DEFAULT 'DISPONIVEL',
    "promotion_id" TEXT,
    "filter_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "productCategories" (
    "id" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "category_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "productCategories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reviews" (
    "id" TEXT NOT NULL,
    "rating" "Rating" NOT NULL DEFAULT 'ONE',
    "comment" TEXT,
    "product_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "nameCustomer" TEXT NOT NULL,
    "status" "StatusReview" NOT NULL DEFAULT 'ANAILSE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reviews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "buysTogethers" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "products" JSONB,
    "status" "StatusBuyTogether" NOT NULL DEFAULT 'SIM',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "buysTogethers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" TEXT NOT NULL,
    "id_order_store" TEXT,
    "total" DOUBLE PRECISION NOT NULL,
    "shippingCost" DOUBLE PRECISION NOT NULL,
    "grandTotal" DOUBLE PRECISION NOT NULL,
    "status" "OrderStatus" NOT NULL DEFAULT 'PENDING',
    "address_id" TEXT,
    "shippingMethod" TEXT,
    "trackingCode" TEXT,
    "estimatedDelivery" TEXT,
    "customer_id" UUID NOT NULL,
    "promotion_id" JSONB,
    "cart_id" UUID,
    "assigned_userEcommerce_id" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orderItens" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "price" DOUBLE PRECISION NOT NULL,
    "order_id" TEXT NOT NULL,
    "product_id" UUID NOT NULL,
    "variant_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "orderItens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "carts" (
    "id" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "subtotal" DOUBLE PRECISION NOT NULL,
    "shippingCost" DOUBLE PRECISION,
    "total" DOUBLE PRECISION NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "carts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cartItens" (
    "id" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "product_id" UUID NOT NULL,
    "cart_id" TEXT NOT NULL,
    "variant_id" UUID,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cartItens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commentsOrder" (
    "id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "userEcommerce_id" TEXT,
    "message" TEXT NOT NULL,
    "status" "StatusCommentOrder" NOT NULL DEFAULT 'PRIVATE',
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commentsOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "commentAttachments" (
    "id" TEXT NOT NULL,
    "comment_id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "filename" TEXT NOT NULL,
    "mimetype" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "commentAttachments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "abandonedCarts" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "items" JSONB NOT NULL,
    "total" DOUBLE PRECISION NOT NULL,
    "abandonedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reminderSentAt" TIMESTAMP(3),
    "reminderCount" INTEGER NOT NULL DEFAULT 0,
    "discountCode" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "abandonedCarts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emailReminders" (
    "id" TEXT NOT NULL,
    "cart_id" TEXT NOT NULL,
    "template_id" TEXT,
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "opened" BOOLEAN NOT NULL DEFAULT false,
    "clicked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "emailReminders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emailTemplates" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "subject" TEXT,
    "templateName" TEXT NOT NULL,
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "hoursAfter" INTEGER,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emailTemplates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" "PaymentMethod" NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "transaction_id" TEXT,
    "asaas_customer_id" TEXT,
    "asaas_payment_id" TEXT,
    "description" TEXT,
    "installment_plan" JSONB,
    "pix_qr_code" TEXT,
    "pix_expiration" TIMESTAMP(3),
    "boleto_url" TEXT,
    "boleto_barcode" TEXT,
    "credit_card_token" TEXT,
    "gateway_response" JSONB,
    "order_id" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "paymentWebhooks" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "asaas_payment_id" TEXT,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "paymentWebhooks_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "melhorEnvioWebhooksLog" (
    "id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "dataId" TEXT,
    "payload" JSONB NOT NULL,
    "signature" TEXT,
    "receivedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed" BOOLEAN NOT NULL DEFAULT false,
    "processedAt" TIMESTAMP(3),
    "error" TEXT,

    CONSTRAINT "melhorEnvioWebhooksLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shippingsLabel" (
    "id" TEXT NOT NULL,
    "melhorEnvioId" TEXT NOT NULL,
    "protocol" TEXT,
    "status" TEXT NOT NULL,
    "tracking" TEXT,
    "trackingUrl" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "shippingsLabel_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "address" (
    "id" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "recipient_name" TEXT,
    "street" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "state" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "number" TEXT,
    "neighborhood" TEXT,
    "country" TEXT NOT NULL,
    "complement" TEXT,
    "reference" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "favorites" (
    "customer_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "favorites_pkey" PRIMARY KEY ("customer_id","product_id")
);

-- CreateTable
CREATE TABLE "formContacts" (
    "id" TEXT NOT NULL,
    "name_user" VARCHAR(200) NOT NULL,
    "slug_name_user" TEXT NOT NULL,
    "email_user" VARCHAR(200) NOT NULL,
    "subject" VARCHAR(250) NOT NULL,
    "message" VARCHAR(5000) NOT NULL,
    "created_at" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "formContacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "newsletters" (
    "id" TEXT NOT NULL,
    "email_user" VARCHAR(100) NOT NULL,
    "created_at" TIMESTAMPTZ(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "newsletters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificationUsersEcommerce" (
    "id" TEXT NOT NULL,
    "userEcommerce_id" TEXT,
    "type" "NotificationType" NOT NULL DEFAULT 'INDEFINIDO',
    "message" VARCHAR(500) NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificationUsersEcommerce_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notificationCustomers" (
    "id" TEXT NOT NULL,
    "customer_id" UUID,
    "type" "NotificationType" NOT NULL DEFAULT 'INDEFINIDO',
    "message" VARCHAR(500) NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "link" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notificationCustomers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketingPublications" (
    "id" UUID NOT NULL,
    "title" VARCHAR(555),
    "description" VARCHAR(7000),
    "local" VARCHAR(555),
    "image_url" VARCHAR(4083),
    "redirect_url" VARCHAR(5083),
    "position" "Position" NOT NULL,
    "conditions" TEXT,
    "clicks" DOUBLE PRECISION DEFAULT 0,
    "text_button" VARCHAR(100),
    "status" "StatusMarketingPublication" NOT NULL DEFAULT 'Disponivel',
    "text_publication" VARCHAR(7000),
    "popup_time" INTEGER,
    "publish_at_start" TIMESTAMPTZ(3),
    "publish_at_end" TIMESTAMPTZ(3),
    "is_processing" BOOLEAN NOT NULL DEFAULT false,
    "is_completed" BOOLEAN NOT NULL DEFAULT false,
    "email_sent" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "marketingPublications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bannerIntervals" (
    "id" TEXT NOT NULL,
    "interval_banner" INTEGER NOT NULL,
    "label_interval_banner" TEXT NOT NULL,
    "local_site" TEXT,
    "label_local_site" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3),

    CONSTRAINT "bannerIntervals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "marketingPublicationViews" (
    "id" UUID NOT NULL,
    "marketingPublication_id" UUID,
    "ipAddress" VARCHAR(45),
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "marketingPublicationViews_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filters" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fieldName" TEXT NOT NULL,
    "attributeKeys" JSONB,
    "type" "FilterType" NOT NULL,
    "dataType" "FilterDataType" NOT NULL,
    "displayStyle" "FilterDisplayStyle" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "autoPopulate" BOOLEAN NOT NULL DEFAULT false,
    "minValue" DOUBLE PRECISION,
    "maxValue" DOUBLE PRECISION,
    "groupId" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "filterGroups" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "filterGroups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "categoryFilters" (
    "id" TEXT NOT NULL,
    "category_id" TEXT NOT NULL,
    "filter_id" TEXT NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "categoryFilters_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menus" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "position" TEXT NOT NULL,
    "identifier" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "icon" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menus_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "menuItems" (
    "id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "type" "MenuItemType" NOT NULL,
    "url" TEXT,
    "category_id" TEXT,
    "product_id" TEXT,
    "customPageSlug" TEXT,
    "icon" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "menu_id" TEXT,
    "parentId" TEXT,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "menuItems_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_ProductPromotions" (
    "A" UUID NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ProductPromotions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_variantPromotions" (
    "A" UUID NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_variantPromotions_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_DirectCategoryFilters" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_DirectCategoryFilters_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "seoSettings_page_key" ON "seoSettings"("page");

-- CreateIndex
CREATE UNIQUE INDEX "usersEcommerce_email_key" ON "usersEcommerce"("email");

-- CreateIndex
CREATE UNIQUE INDEX "customers_email_key" ON "customers"("email");

-- CreateIndex
CREATE UNIQUE INDEX "products_slug_key" ON "products"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "products_skuMaster_key" ON "products"("skuMaster");

-- CreateIndex
CREATE UNIQUE INDEX "productsVariants_sku_key" ON "productsVariants"("sku");

-- CreateIndex
CREATE UNIQUE INDEX "productsRelations_parentProduct_id_childProduct_id_relation_key" ON "productsRelations"("parentProduct_id", "childProduct_id", "relationType");

-- CreateIndex
CREATE UNIQUE INDEX "promotion_coupons_code_key" ON "promotion_coupons"("code");

-- CreateIndex
CREATE UNIQUE INDEX "productsViews_product_id_ipAddress_key" ON "productsViews"("product_id", "ipAddress");

-- CreateIndex
CREATE UNIQUE INDEX "categories_name_key" ON "categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "productCategories_product_id_category_id_key" ON "productCategories"("product_id", "category_id");

-- CreateIndex
CREATE UNIQUE INDEX "orders_id_order_store_key" ON "orders"("id_order_store");

-- CreateIndex
CREATE UNIQUE INDEX "carts_customer_id_key" ON "carts"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "cartItens_cart_id_product_id_variant_id_key" ON "cartItens"("cart_id", "product_id", "variant_id");

-- CreateIndex
CREATE UNIQUE INDEX "abandonedCarts_cart_id_key" ON "abandonedCarts"("cart_id");

-- CreateIndex
CREATE UNIQUE INDEX "emailTemplates_templateName_key" ON "emailTemplates"("templateName");

-- CreateIndex
CREATE UNIQUE INDEX "payments_order_id_key" ON "payments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "paymentWebhooks_event_key" ON "paymentWebhooks"("event");

-- CreateIndex
CREATE INDEX "melhorEnvioWebhooksLog_dataId_idx" ON "melhorEnvioWebhooksLog"("dataId");

-- CreateIndex
CREATE UNIQUE INDEX "shippingsLabel_melhorEnvioId_key" ON "shippingsLabel"("melhorEnvioId");

-- CreateIndex
CREATE UNIQUE INDEX "marketingPublicationViews_marketingPublication_id_ipAddress_key" ON "marketingPublicationViews"("marketingPublication_id", "ipAddress");

-- CreateIndex
CREATE UNIQUE INDEX "categoryFilters_category_id_filter_id_key" ON "categoryFilters"("category_id", "filter_id");

-- CreateIndex
CREATE INDEX "_ProductPromotions_B_index" ON "_ProductPromotions"("B");

-- CreateIndex
CREATE INDEX "_variantPromotions_B_index" ON "_variantPromotions"("B");

-- CreateIndex
CREATE INDEX "_DirectCategoryFilters_B_index" ON "_DirectCategoryFilters"("B");

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_mainPromotion_id_fkey" FOREIGN KEY ("mainPromotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_buyTogether_id_fkey" FOREIGN KEY ("buyTogether_id") REFERENCES "buysTogethers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productsVariants" ADD CONSTRAINT "productsVariants_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productsVariants" ADD CONSTRAINT "productsVariants_mainPromotion_id_fkey" FOREIGN KEY ("mainPromotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productsVariantVideos" ADD CONSTRAINT "productsVariantVideos_productVariant_id_fkey" FOREIGN KEY ("productVariant_id") REFERENCES "productsVariants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productsVariantImages" ADD CONSTRAINT "productsVariantImages_productVariant_id_fkey" FOREIGN KEY ("productVariant_id") REFERENCES "productsVariants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variantsAttributes" ADD CONSTRAINT "variantsAttributes_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "productsVariants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "variantsAttributesimages" ADD CONSTRAINT "variantsAttributesimages_variantAttribute_id_fkey" FOREIGN KEY ("variantAttribute_id") REFERENCES "variantsAttributes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productsRelations" ADD CONSTRAINT "productsRelations_parentProduct_id_fkey" FOREIGN KEY ("parentProduct_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productsRelations" ADD CONSTRAINT "productsRelations_childProduct_id_fkey" FOREIGN KEY ("childProduct_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productsRelations" ADD CONSTRAINT "productsRelations_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productsDescriptions" ADD CONSTRAINT "productsDescriptions_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productsImages" ADD CONSTRAINT "productsImages_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productsVideos" ADD CONSTRAINT "productsVideos_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionsproducts" ADD CONSTRAINT "questionsproducts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "questionsproducts" ADD CONSTRAINT "questionsproducts_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsesquestionsoroduct" ADD CONSTRAINT "responsesquestionsoroduct_userEcommerce_id_fkey" FOREIGN KEY ("userEcommerce_id") REFERENCES "usersEcommerce"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "responsesquestionsoroduct" ADD CONSTRAINT "responsesquestionsoroduct_questionProduct_id_fkey" FOREIGN KEY ("questionProduct_id") REFERENCES "questionsproducts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_coupons" ADD CONSTRAINT "promotion_coupons_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_conditions" ADD CONSTRAINT "promotion_conditions_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_actions" ADD CONSTRAINT "promotion_actions_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_displays" ADD CONSTRAINT "promotion_displays_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotion_badges" ADD CONSTRAINT "promotion_badges_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productsViews" ADD CONSTRAINT "productsViews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotionUsages" ADD CONSTRAINT "promotionUsages_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotionUsages" ADD CONSTRAINT "promotionUsages_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "promotionUsages" ADD CONSTRAINT "promotionUsages_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_promotion_id_fkey" FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categories" ADD CONSTRAINT "categories_filter_id_fkey" FOREIGN KEY ("filter_id") REFERENCES "filters"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productCategories" ADD CONSTRAINT "productCategories_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "productCategories" ADD CONSTRAINT "productCategories_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reviews" ADD CONSTRAINT "reviews_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_address_id_fkey" FOREIGN KEY ("address_id") REFERENCES "address"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_assigned_userEcommerce_id_fkey" FOREIGN KEY ("assigned_userEcommerce_id") REFERENCES "usersEcommerce"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderItens" ADD CONSTRAINT "orderItens_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderItens" ADD CONSTRAINT "orderItens_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orderItens" ADD CONSTRAINT "orderItens_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "productsVariants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "carts" ADD CONSTRAINT "carts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartItens" ADD CONSTRAINT "cartItens_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartItens" ADD CONSTRAINT "cartItens_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cartItens" ADD CONSTRAINT "cartItens_variant_id_fkey" FOREIGN KEY ("variant_id") REFERENCES "productsVariants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentsOrder" ADD CONSTRAINT "commentsOrder_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentsOrder" ADD CONSTRAINT "commentsOrder_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentsOrder" ADD CONSTRAINT "commentsOrder_userEcommerce_id_fkey" FOREIGN KEY ("userEcommerce_id") REFERENCES "usersEcommerce"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "commentAttachments" ADD CONSTRAINT "commentAttachments_comment_id_fkey" FOREIGN KEY ("comment_id") REFERENCES "commentsOrder"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abandonedCarts" ADD CONSTRAINT "abandonedCarts_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "carts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "abandonedCarts" ADD CONSTRAINT "abandonedCarts_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emailReminders" ADD CONSTRAINT "emailReminders_cart_id_fkey" FOREIGN KEY ("cart_id") REFERENCES "abandonedCarts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emailReminders" ADD CONSTRAINT "emailReminders_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "emailTemplates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "address" ADD CONSTRAINT "address_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "favorites" ADD CONSTRAINT "favorites_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificationUsersEcommerce" ADD CONSTRAINT "notificationUsersEcommerce_userEcommerce_id_fkey" FOREIGN KEY ("userEcommerce_id") REFERENCES "usersEcommerce"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notificationCustomers" ADD CONSTRAINT "notificationCustomers_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "marketingPublicationViews" ADD CONSTRAINT "marketingPublicationViews_marketingPublication_id_fkey" FOREIGN KEY ("marketingPublication_id") REFERENCES "marketingPublications"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "filters" ADD CONSTRAINT "filters_groupId_fkey" FOREIGN KEY ("groupId") REFERENCES "filterGroups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categoryFilters" ADD CONSTRAINT "categoryFilters_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "categoryFilters" ADD CONSTRAINT "categoryFilters_filter_id_fkey" FOREIGN KEY ("filter_id") REFERENCES "filters"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menuItems" ADD CONSTRAINT "menuItems_menu_id_fkey" FOREIGN KEY ("menu_id") REFERENCES "menus"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "menuItems" ADD CONSTRAINT "menuItems_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "menuItems"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductPromotions" ADD CONSTRAINT "_ProductPromotions_A_fkey" FOREIGN KEY ("A") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ProductPromotions" ADD CONSTRAINT "_ProductPromotions_B_fkey" FOREIGN KEY ("B") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_variantPromotions" ADD CONSTRAINT "_variantPromotions_A_fkey" FOREIGN KEY ("A") REFERENCES "productsVariants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_variantPromotions" ADD CONSTRAINT "_variantPromotions_B_fkey" FOREIGN KEY ("B") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DirectCategoryFilters" ADD CONSTRAINT "_DirectCategoryFilters_A_fkey" FOREIGN KEY ("A") REFERENCES "categories"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_DirectCategoryFilters" ADD CONSTRAINT "_DirectCategoryFilters_B_fkey" FOREIGN KEY ("B") REFERENCES "filters"("id") ON DELETE CASCADE ON UPDATE CASCADE;
