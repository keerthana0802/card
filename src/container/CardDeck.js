import React, { PureComponent } from "react";
import { Gesture } from "react-with-gesture";
import { add, scale } from "vec-la";
import Card from "../components/Card";
//import DragDetect from "../container/DragDetect";
import styled from "styled-components";
import { Spring } from "react-spring";
import PropTypes from "prop-types";

const initialState = {
  thrownCards: {}
};

// added PropTypes here as constant - easier to convert to FlowTypes
// Todo: Check if it is possible to use Flow in Codesandbox?
const cardDeckPropTypes = {
  cards: PropTypes.array,
  reverse: PropTypes.bool,
  displayNoCardsLeft: PropTypes.bool,
  cardDeckId: PropTypes.number
};

const THROW_VELOCITY_THRESHOLD = 0.3;

class CardDeck extends PureComponent {
  state = {
    ...initialState,
    prevPropsCardDeckId: this.props.cardDeckId,
    cards: this.props.cards ? this.props.cards.reverse() : []
  };

  static defaultProps = {
    cardDeckId: Date.now(),
    displayNoCardsLeft: false
  };

  /*
  Example cards prop:
    cards: [
      {
        id: 0,
        title: "First",
        content: <PlaceholderImg />,
        // or children: 'content goes here'
      },
      {
        id: 1,
        title: "Second",
        content: "Second text",
      },
      {
        id: 2,
        title: "Third",
        content: "Third text",
      }
    ]
*/

  // Compare prevDeckID from state to received - used for resetting state
  // Note: If cardDeckId changes we're getting a new wrapper (uses key on wrapper)
  static getDerivedStateFromProps(nextProps, state) {
    if (nextProps.cardDeckId !== state.prevPropsCardDeckId) {
      return {
        ...initialState,
        prevPropsCardDeckId: nextProps.cardDeckId
      };
    }
    return null;
  }

  cardAnimationDone = (id, isThrown) => {
    this.setState(state => ({
      thrownCards: {
        ...state.thrownCards,
        [id]: isThrown
      }
    }));
  };
  // This is the render method that will be called once everything is arranged
  // depending on the API used render props, card prop or card childs
  renderCards = cardsInput => {
    const { cardDeckId, reverse, displayNoCardsLeft } = this.props;
    const { thrownCards } = this.state;
    const cards = reverse ? cardsInput.reverse() : cardsInput;
    const isThrown = id => thrownCards && thrownCards[id];

    return (
      <Wrapper key={cardDeckId}>
        <Card
          title="No cards left"
          fixed
          content=""
          isVisible={displayNoCardsLeft}
        />
        {cards.map(
          cardProps =>
            /* Create a drag detection component for each card */
            !isThrown(cardProps.id) && (
              <Gesture
                key={cardProps.id}
                touch={!cardProps.fixed}
                mouse={!cardProps.fixed}
                //onThrow={this.countThrown}
              >
                {({ first, down, delta, velocity, direction }) => {
                  const willThrow =
                    !down && velocity > THROW_VELOCITY_THRESHOLD;
                  const cardThrown = isThrown(cardProps.id);
                  const releasedNotThrown = !down && !cardThrown;
                  const springConfig = willThrow
                    ? {
                        velocity: scale(direction, velocity),
                        decay: true
                      }
                    : {
                        tension: 140,
                        friction: 30,
                        precision: 0.05
                      };
                  return (
                    /* We're using reset & reverse so the card animates to pos. 0,0 if not thrown */
                    <Spring
                      native
                      reset={releasedNotThrown}
                      immediate={down && !cardThrown}
                      reverse={releasedNotThrown}
                      from={{ xy: [0, 0] }}
                      to={{ xy: delta, opacity: 1.0 }} // opacity: willThrow ? 0.0 : 1.0 }}
                      config={springConfig}
                      onRest={() => {
                        if (!down && willThrow) {
                          this.cardAnimationDone(cardProps.id, willThrow);
                        }
                      }}
                    >
                      {({ xy, opacity }) => [
                        <Card
                          {...cardProps}
                          //dragHandle={!cardProps.fixed && dragHandle}
                          isVisible={opacity.interpolate(o => o > 0.1)}
                          children={cardProps.content || cardProps.children}
                          style={{
                            opacity,
                            transform: xy.interpolate(
                              (x, y) =>
                                `translate(${x}px, ${y}px) scale(${
                                  down ? 1.1 : 1
                                }, ${down ? 1.1 : 1})`
                            )
                          }}
                        />,
                        JSON.stringify(xy.getValue(), null, 2)
                      ]}
                    </Spring>
                  );
                }}
              </Gesture>
            )
        )}
        {Object.keys(this.state.thrownCards).length === 0 && (
          <InfoText>
            Touch + hold header & throw the card to reveal other cards.
          </InfoText>
        )}
      </Wrapper>
    );
  };

  // Render props api (exposes addCards & renderCards)
  // 1. Call addCards(array or "title", "content")
  // 2. Call and return renderCards() at the end
  // (I personally don't like it & I would use child api or cards prop)
  renderProps = () => {
    const cards = [];
    return this.props.children({
      addCards: args => {
        if (Array.isArray(args)) {
          cards.push(...args);
        } else {
          cards.push({
            ...args,
            id: cards.length
          });
        }
      },
      renderCards: () => this.renderCards(cards.reverse())
    });
  };

  // Render method is checking which api is used and renders the cards with this.renderCards
  render() {
    // const allThrown = this.state.thrownCount === cards.length; // we could use this to render something only for the last card - not used at the moment
    if (this.props.cards) {
      return this.renderCards(this.props.cards);
    } else if (typeof this.props.children === "function") {
      return this.renderProps();
    } else {
      // finally there must be card(s) as child
      if (this.props.children) {
        // We have to extract the props because we're rendering the cards later with additional props for animation & drag handling
        const cards = Array.isArray(this.props.children) // check if multiple cards
          ? this.props.children
              .flat()
              .map((child, index) => ({ ...child.props, id: index }))
              .reverse()
          : [{ ...this.props.children.props, id: 0 }];
        return this.renderCards(cards);
      } else {
        console.error(
          "No cards available to render. Please pass them as prop, render prop or children."
        );
        return null;
      }
    }
  }
}

const Wrapper = styled.div`
  font-family: sans-serif;
`;

const InfoText = styled.div`
  position: absolute;
  bottom: 10%;
  width: 100%;
  text-align: center;
`;

CardDeck.propTypes = cardDeckPropTypes;

export default CardDeck;
