import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { GraphQLError } from "graphql";

// 2. Connect to DB
import Product from "./models/Product.js";
import connectDB from "./lib/dbConnect.js";

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = `#graphql
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.
  enum Bernoulli {
    AZ
    ZA
    menorPrecio
    mayorPrecio
  }
  enum Category {
    panaderia_y_pasteleria
  }

  # This "Book" type defines the queryable fields for every book in our data source.
  type Product {
    data_id: Int
    data_price: Float
    data_brand: String
    data_uri: String
    data_name: String
    data_category: String
    category: String
    class_category: String
    sub_category: String
  }

  type ClassCategory {
    class_category: String
    total:Int

  }

  type SubCategory {
    _id:String
    sub:[ClassCategory]

  }


  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    countProducts(category:Category, sub_category:String, class_category:String): Int 
    products(sort:Bernoulli, category:Category, sub_category:String, class_category:String): [Product]
    groupingSubCategory(category:Category):[SubCategory]
  }

`;

const orders = {
  AZ: { data_name: 1 },
  ZA: { data_name: -1 },
  mayorPrecio: { data_price: -1 },
  menorPrecio: { data_price: 1 },
};

const categories = {
  panaderia_y_pasteleria: "panaderia-y-pasteleria",
};

const resolvers = {
  Query: {
    products: async (root, args) => {
      const { sort, category, sub_category, class_category } = args;

      let query = [
        { $match: { category: categories[category] } },
        { $sort: orders[sort] },
        { $project: { _id: 0 } },
      ];
      if (sub_category && class_category) {
        query = [
          {
            $match: {
              category: categories[category],
              sub_category: sub_category,
              class_category: class_category,
            },
          },
          { $sort: orders[sort] },
          { $project: { _id: 0 } },
        ];
      }
      else if (sub_category) {
        query = [
          {
            $match: {
              category: categories[category],
              sub_category: sub_category,
            },
          },
          { $sort: orders[sort] },
          { $project: { _id: 0 } },
        ];
      }
      else {
        query=query
      }
      //   const category = "panaderia-y-pasteleria";
      
      await connectDB();
      const result = await Product.aggregate(query);
      const data = JSON.stringify(result);
      const dataTo = JSON.parse(data);

      return dataTo;
    },
    countProducts: async (root, args) => {
      const {category, sub_category, class_category } = args;
      
      let query=[{$match :{ category: categories[category]}}]
      
      if (sub_category && class_category) {
        query=[{$match :{ category: categories[category], sub_category:sub_category, class_category:class_category}}]
        
      }
      else if (sub_category) {
        query=[{$match :{ category: categories[category], sub_category:sub_category}}]
      }
      else {
        query = query  
      }

      await connectDB();
      const result = await Product.aggregate(query);

      return result.length;
    },
    groupingSubCategory: async (root, args) => {
      const {category } = args;
    
      const query = [
        { $match: { category: categories[category] } },
        {
          $group: {
            _id: {
              sub_category: "$sub_category",
              class_category: "$class_category",
            },
            total: { $sum: 1 },
          },
        },
        {
          $project: {
            sub_category: "$_id.sub_category",
            class_category: "$_id.class_category",
            total: 1,
            _id: 0,
          },
        },
        {
          $group: {
            _id: "$sub_category",
            sub: {
              $push: {
                class_category: "$class_category",
                total: "$total",
              },
            },
          },
        },
      ];
      await connectDB();
      const result = await Product.aggregate(query);

      return result;
    },
  },
};

const server = new ApolloServer({
  typeDefs,
  resolvers,
});

const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀  Server ready at: ${url}`);
