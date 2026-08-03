import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { GraphQLError } from "graphql";
import axios from "axios";

// A schema is a collection of type definitions (hence "typeDefs")
// that together define the "shape" of queries that are executed against
// your data.
const typeDefs = `#graphql
  # Comments in GraphQL strings (such as this one) start with the hash (#) symbol.

  enum Days {
    Monday
    Tuesday
    Wenesday
    Thursday
    Friday
  } 

  type Date {
    year:String
    month:String
    
  }

  # This "Book" type defines the queryable fields for every book in our data source.
  type Book {
    title: String
    author: String
    date: Date
    publisher: String
    authorPublisher: String
  }

  # The "Query" type is special: it lists all of the available queries that
  # clients can execute, along with the return type for each. In this
  # case, the "books" query returns an array of zero or more Books (defined above).
  type Query {
    countBooks: Int 
    books: [Book]
  }

  type Mutation {
    addBook(
        title: String
        author: String
        publisher: String
        year: String
        month: String
        day:Days
    ):Book
  }
`;



// Resolvers define how to fetch the types defined in your schema.
// This resolver retrieves books from the "books" array above.
// Recall books:[Book], so Book access to fields of books array
// root is similar to `this` in an array.

const resolvers = {
  Query: {
    books: async (root) => {
      const resp = await axios('http://localhost:3000')
      return resp.data
    }
    ,
    countBooks: async (root) => {
      const resp = await axios('http://localhost:3000')
      return resp.data.length
    // query to server

  }},
  Book: {
    authorPublisher: (root) => `${root.author} - ${root.publisher}`,
    date: (root) => {
      return {
        year: root.year,
        month: root.month,
      };
    },
  },
  Mutation: {
    addBook: async (root, args) => {
      const resp = await axios('http://localhost:3000')
      const books = resp.data
      const book = args;
      if (books.find(e => e.title == book.title)) {
        throw new GraphQLError("The title must be unique",{
            extensions:{
                code:'BAD_USER_INPUT'
            }
        }

        )
      }
      
      books.push(book);
      return book;
    },
  },
};

// The ApolloServer constructor requires two parameters: your schema
// definition and your set of resolvers.
const server = new ApolloServer({
  typeDefs,
  resolvers,
});

// Passing an ApolloServer instance to the `startStandaloneServer` function:
//  1. creates an Express app
//  2. installs your ApolloServer instance as middleware
//  3. prepares your app to handle incoming requests
const { url } = await startStandaloneServer(server, {
  listen: { port: 4000 },
});

console.log(`🚀  Server ready at: ${url}`);
